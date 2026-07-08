import OpenAI from "openai";
import { logger } from "../lib/logger";

export type ProviderStatus =
  | "connected"
  | "missing_key"
  | "invalid_key"
  | "quota_exceeded"
  | "rate_limited"
  | "provider_offline"
  | "network_error"
  | "loading";

export type ProviderName = "gemini" | "groq" | "openai" | "none";

export interface ProviderState {
  status: ProviderStatus;
  message: string;
  lastChecked: string | null;
  providerName: ProviderName;
}

export interface ProviderHandle {
  client: OpenAI;
  model: string;
  providerName: ProviderName;
}

/**
 * Error classification result.
 * `withinProviderRetryable`: whether withRetry() should re-attempt the *same* provider.
 * Regardless of this flag, the pipeline will always try the next provider on failure.
 */
export interface ClassifiedError {
  status: ProviderStatus;
  /** Message only shown when ALL providers are exhausted. */
  userMessage: string;
  /** Whether to retry the same provider (e.g. transient 5xx, rate limit). */
  withinProviderRetryable: boolean;
}

interface ProviderConfig {
  name: ProviderName;
  envKey: string;
  baseURL: string;
  model: string;
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    name: "gemini",
    envKey: "GEMINI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-2.0-flash",
  },
  {
    name: "groq",
    envKey: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  {
    name: "openai",
    envKey: "OPENAI_API_KEY",
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
];

class AIProviderService {
  /** Ordered list of ready provider handles, primary first. */
  private providers: ProviderHandle[] = [];

  private state: ProviderState = {
    status: "loading",
    message: "Initializing AI providers...",
    lastChecked: null,
    providerName: "none",
  };

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    for (const cfg of PROVIDER_CONFIGS) {
      const apiKey = process.env[cfg.envKey];
      if (!apiKey) {
        logger.debug(`AIProvider: ${cfg.name} skipped — ${cfg.envKey} not set`);
        continue;
      }
      const client = new OpenAI({ apiKey, baseURL: cfg.baseURL });
      this.providers.push({ client, model: cfg.model, providerName: cfg.name });
      logger.info(`AIProvider: ${cfg.name} registered (model: ${cfg.model})`);
    }

    if (this.providers.length === 0) {
      this.setState(
        "missing_key",
        "No AI provider keys configured. Set GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY.",
        "none",
      );
      logger.warn("AIProvider: no provider keys found — AI features disabled");
      return;
    }

    const primary = this.providers[0]!;
    this.setState(
      "connected",
      `AI ready via ${primary.providerName} (model: ${primary.model}).`,
      primary.providerName,
    );
  }

  private setState(status: ProviderStatus, message: string, providerName: ProviderName): void {
    this.state = { status, message, lastChecked: new Date().toISOString(), providerName };
  }

  /** Primary provider, or null if none configured. */
  getClient(): OpenAI | null {
    return this.providers[0]?.client ?? null;
  }

  /** All configured providers in priority order. */
  getAllProviders(): ProviderHandle[] {
    return [...this.providers];
  }

  getStatus(): ProviderState {
    return { ...this.state };
  }

  /** Always updates provider identity so health routes reflect the active provider. */
  markConnected(providerName: ProviderName): void {
    const handle = this.providers.find((p) => p.providerName === providerName);
    this.setState(
      "connected",
      `AI ready via ${providerName}${handle ? ` (model: ${handle.model})` : ""}.`,
      providerName,
    );
  }

  /**
   * Classify an error from one provider.
   *
   * `withinProviderRetryable` controls whether withRetry() re-attempts the same provider.
   * The pipeline ALWAYS tries the next provider on any failure — auth/quota errors on
   * provider A should not prevent trying provider B.
   */
  classifyError(err: unknown, providerName: ProviderName = "none"): ClassifiedError {
    const e = err as { status?: number; code?: string; message?: string };

    if (e.code === "insufficient_quota") {
      logger.warn({ providerName }, "AIProvider: quota exceeded");
      return {
        status: "quota_exceeded",
        userMessage:
          "All configured AI providers have exceeded their quotas. Your message was saved.",
        withinProviderRetryable: false,
      };
    }

    if (e.status === 401) {
      logger.warn({ providerName }, "AIProvider: invalid key");
      return {
        status: "invalid_key",
        userMessage:
          "All configured AI API keys are invalid. Your message was saved. Please check your key configuration.",
        withinProviderRetryable: false,
      };
    }

    if (e.status === 429) {
      return {
        status: "rate_limited",
        userMessage:
          "All AI providers are currently rate-limited. Your message was saved — try again in a moment.",
        withinProviderRetryable: true,
      };
    }

    if (e.status === 500 || e.status === 502 || e.status === 503 || e.status === 504) {
      return {
        status: "provider_offline",
        userMessage:
          "All AI providers are experiencing issues. Your message was saved — try again shortly.",
        withinProviderRetryable: true,
      };
    }

    if (err instanceof TypeError) {
      return {
        status: "network_error",
        userMessage:
          "Couldn't reach any AI provider due to a network error. Your message was saved.",
        withinProviderRetryable: false,
      };
    }

    return {
      status: "provider_offline",
      userMessage:
        "Sorry, something went wrong. Your message was saved — try again in a moment.",
      withinProviderRetryable: false,
    };
  }
}

export const aiProvider = new AIProviderService();
