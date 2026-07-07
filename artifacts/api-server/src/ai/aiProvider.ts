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

export interface ProviderState {
  status: ProviderStatus;
  message: string;
  lastChecked: string | null;
}

class AIProviderService {
  private client: OpenAI | null = null;
  private state: ProviderState = {
    status: "loading",
    message: "Initializing AI provider...",
    lastChecked: null,
  };

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      this.setState("missing_key", "OpenAI API key is not configured. Add OPENAI_API_KEY to enable AI chat.");
      logger.warn("AIProvider: OPENAI_API_KEY is not set — AI features disabled");
      return;
    }

    this.client = new OpenAI({ apiKey });
    this.setState("connected", "AI provider is ready.");
    logger.info("AIProvider: OpenAI client initialized");
  }

  private setState(status: ProviderStatus, message: string): void {
    this.state = { status, message, lastChecked: new Date().toISOString() };
  }

  getClient(): OpenAI | null {
    return this.client;
  }

  getStatus(): ProviderState {
    return { ...this.state };
  }

  /**
   * Call after a successful OpenAI API response to restore "connected" status
   * if a transient error had previously downgraded it.
   */
  markConnected(): void {
    if (this.state.status !== "connected" && this.client) {
      this.setState("connected", "AI provider is ready.");
    }
  }

  /**
   * Classify an OpenAI API error into a user-friendly status + message.
   * Persists the new status so /api/ai-provider/status reflects reality.
   */
  classifyError(err: unknown): { status: ProviderStatus; userMessage: string } {
    const e = err as { status?: number; code?: string; message?: string };

    if (e.code === "insufficient_quota") {
      this.setState("quota_exceeded", "API quota has been exceeded. Check your OpenAI billing.");
      return {
        status: "quota_exceeded",
        userMessage:
          "I couldn't contact the AI because your API quota has been exceeded. Your message has been safely saved. Please check your OpenAI billing to continue.",
      };
    }

    if (e.status === 401) {
      this.setState("invalid_key", "API key is invalid or expired.");
      return {
        status: "invalid_key",
        userMessage:
          "The AI API key appears to be invalid. Your message has been saved. Please check your OPENAI_API_KEY configuration.",
      };
    }

    if (e.status === 429) {
      this.setState("rate_limited", "OpenAI is rate-limiting requests. Try again in a moment.");
      return {
        status: "rate_limited",
        userMessage:
          "The AI is temporarily rate-limited. Your message has been saved — try again in a moment.",
      };
    }

    if (e.status === 500 || e.status === 502 || e.status === 503 || e.status === 504) {
      this.setState("provider_offline", "OpenAI is experiencing service issues.");
      return {
        status: "provider_offline",
        userMessage:
          "OpenAI is currently experiencing issues. Your message has been saved — I'll continue once the service is restored.",
      };
    }

    if (err instanceof TypeError) {
      this.setState("network_error", "Network error reaching AI provider.");
      return {
        status: "network_error",
        userMessage:
          "I couldn't reach the AI due to a network error. Your message has been saved. Please check your internet connection.",
      };
    }

    // Unknown error — mark as offline but don't override key-level statuses
    if (this.state.status === "connected") {
      this.setState("provider_offline", "An unexpected error occurred.");
    }
    return {
      status: "provider_offline",
      userMessage:
        "Sorry, something went wrong while thinking that through. Your message was saved — try again in a moment.",
    };
  }
}

export const aiProvider = new AIProviderService();
