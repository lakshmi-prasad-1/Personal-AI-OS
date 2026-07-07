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
      this.state = {
        status: "missing_key",
        message: "OpenAI API key is not configured. Add OPENAI_API_KEY to enable AI chat.",
        lastChecked: new Date().toISOString(),
      };
      logger.warn("AIProvider: OPENAI_API_KEY is not set — AI features disabled");
      return;
    }

    this.client = new OpenAI({ apiKey });
    this.state = {
      status: "connected",
      message: "AI provider is ready.",
      lastChecked: new Date().toISOString(),
    };
    logger.info("AIProvider: OpenAI client initialized");
  }

  getClient(): OpenAI | null {
    return this.client;
  }

  getStatus(): ProviderState {
    return { ...this.state };
  }

  /**
   * Classify an OpenAI API error into a user-friendly status and message.
   * Also updates the internal provider state for persistent tracking.
   */
  classifyError(err: unknown): { status: ProviderStatus; userMessage: string } {
    const e = err as { status?: number; code?: string; message?: string };

    if (e.code === "insufficient_quota") {
      this.state.status = "quota_exceeded";
      return {
        status: "quota_exceeded",
        userMessage:
          "I couldn't contact the AI because your API quota has been exceeded. Your message has been safely saved. Please check your OpenAI billing to continue.",
      };
    }

    if (e.status === 401) {
      this.state = { ...this.state, status: "invalid_key", message: "API key is invalid or expired." };
      return {
        status: "invalid_key",
        userMessage:
          "The AI API key appears to be invalid. Your message has been saved. Please check your OPENAI_API_KEY configuration.",
      };
    }

    if (e.status === 429) {
      this.state = { ...this.state, status: "rate_limited" };
      return {
        status: "rate_limited",
        userMessage:
          "The AI is temporarily rate-limited. Your message has been saved — try again in a moment.",
      };
    }

    if (
      e.status === 500 ||
      e.status === 502 ||
      e.status === 503 ||
      e.status === 504
    ) {
      return {
        status: "provider_offline",
        userMessage:
          "OpenAI is currently experiencing issues. Your message has been saved — I'll continue once the service is restored.",
      };
    }

    // Generic network/fetch failure
    if (e instanceof TypeError) {
      return {
        status: "network_error",
        userMessage:
          "I couldn't reach the AI due to a network error. Your message has been saved. Please check your internet connection.",
      };
    }

    return {
      status: "provider_offline",
      userMessage:
        "Sorry, something went wrong while thinking that through. Your message was saved — try again in a moment.",
    };
  }
}

export const aiProvider = new AIProviderService();
