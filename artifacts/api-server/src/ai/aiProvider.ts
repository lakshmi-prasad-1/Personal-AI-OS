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

interface ProviderConfig {
  name: ProviderName;
  envKey: string;
  baseURL: string;
  model: string;
  /** Model to use for streaming the final response (some providers differ) */
  streamModel?: string;
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
  /** Ordered list of ready provider handles, primary first */
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

  /**
   * Returns the primary provider handle, or null if none are configured.
   */
  getClient(): OpenAI | null {
    return this.providers[0]?.client ?? null;
  }

  /**
   * Returns the full handle for the primary provider (client + model name).
   */
  getPrimaryProvider(): ProviderHandle | null {
    return this.providers[0] ?? null;
  }

  /**
   * Returns the next provider to try after `currentProviderName`, for fallback.
   * Returns null if there is no further fallback.
   */
  getFallbackProvider(currentProviderName: ProviderName): ProviderHandle | null {
    const idx = this.providers.findIndex((p) => p.providerName === currentProviderName);
    if (idx === -1 || idx + 1 >= this.providers.length) return null;
    return this.providers[idx + 1] ?? null;
  }

  getStatus(): ProviderState {
    return { ...this.state };
  }

  markConnected(providerName: ProviderName): void {
    if (this.state.status !== "connected") {
      const handle = this.providers.find((p) => p.providerName === providerName);
      this.setState(
        "connected",
        `AI ready via ${providerName}${handle ? ` (model: ${handle.model})` : ""}.`,
        providerName,
      );
    }
  }

  /**
   * Classify an API error into a user-friendly status + message.
   * Returns `retryable: true` for transient errors so the pipeline can fall back.
   */
  classifyError(
    err: unknown,
    providerName: ProviderName = "none",
  ): { status: ProviderStatus; userMessage: string; retryable: boolean } {
    const e = err as { status?: number; code?: string; message?: string };

    if (e.code === "insufficient_quota") {
      this.setState(
        "quota_exceeded",
        `${providerName} quota exceeded. Check your billing.`,
        providerName,
      );
      return {
        status: "quota_exceeded",
        userMessage:
          "I couldn't contact the AI because the API quota has been exceeded. Your message has been safely saved.",
        retryable: false,
      };
    }

    if (e.status === 401) {
      this.setState("invalid_key", `${providerName} API key is invalid or expired.`, providerName);
      return {
        status: "invalid_key",
        userMessage:
          "The AI API key appears to be invalid. Your message was saved. Please check your key configuration.",
        retryable: false,
      };
    }

    if (e.status === 429) {
      return {
        status: "rate_limited",
        userMessage: "The AI is temporarily rate-limited. Trying next provider...",
        retryable: true,
      };
    }

    if (e.status === 500 || e.status === 502 || e.status === 503 || e.status === 504) {
      return {
        status: "provider_offline",
        userMessage: `${providerName} is experiencing issues. Trying next provider...`,
        retryable: true,
      };
    }

    if (err instanceof TypeError) {
      return {
        status: "network_error",
        userMessage: "Couldn't reach the AI due to a network error. Trying next provider...",
        retryable: true,
      };
    }

    if (this.state.status === "connected") {
      this.setState("provider_offline", "An unexpected error occurred.", providerName);
    }
    return {
      status: "provider_offline",
      userMessage:
        "Sorry, something went wrong. Your message was saved — try again in a moment.",
      retryable: false,
    };
  }
}

export const aiProvider = new AIProviderService();
