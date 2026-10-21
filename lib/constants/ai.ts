export const AI_PROVIDERS = ["anthropic", "openai", "google"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_THREAD_MODES = ["scenario", "live"] as const;
export type AiThreadMode = (typeof AI_THREAD_MODES)[number];

export const AI_PROPOSAL_STATUSES = ["pending", "applied", "rejected", "stale"] as const;

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = { anthropic: "Claude (Anthropic)", openai: "ChatGPT (OpenAI)", google: "Gemini (Google)" };

export const AI_MODE_LABELS: Record<AiThreadMode, string> = { scenario: "Співавтор", live: "Живий режим" };

export type AiModelOption = { id: string; label: string; tier: "fast" | "smart" };

// перший fast / перший smart у списку — дефолти
export const AI_MODELS: Record<AiProvider, AiModelOption[]> = {
  anthropic: [
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", tier: "fast" },
    { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", tier: "smart" },
    { id: "claude-opus-5-5", label: "Claude Opus 5.5", tier: "smart" },
  ],
  openai: [
    { id: "gpt-5.4-mini", label: "GPT-5.4 mini", tier: "fast" },
    { id: "gpt-5.5", label: "GPT-5.5", tier: "smart" },
  ],
  google: [
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", tier: "fast" },
    { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", tier: "smart" },
    { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", tier: "smart" },
  ],
};

export function defaultModelFor(provider: AiProvider, mode: AiThreadMode): string {
  const tier = mode === "live" ? "fast" : "smart";

  return AI_MODELS[provider].find((m) => m.tier === tier)!.id;
}

export const isKnownModel = (provider: AiProvider, id: string) => AI_MODELS[provider].some((m) => m.id === id);

export const AI_LIMITS = {
  messageChars: 8000,
  historyMessages: 30,
  fullToolResultsInLast: 6,
  toolResultChars: 24_000,
  contextChars: 40_000,
  maxSteps: 8,
  battleEvents: 10,
  searchHits: 20,
  threadTitleChars: 80,
  instructionsChars: 8000,
} as const;

export const API_TOKEN_PREFIX = "dndt_";
export const API_TOKEN_SCOPES = ["ai"] as const;
