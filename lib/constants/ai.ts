export const AI_PROVIDERS = ["anthropic", "openai", "google"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_THREAD_MODES = ["scenario", "live"] as const;
export type AiThreadMode = (typeof AI_THREAD_MODES)[number];

export const AI_PROPOSAL_STATUSES = ["pending", "applied", "rejected", "stale"] as const;

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = { anthropic: "Claude (Anthropic)", openai: "ChatGPT (OpenAI)", google: "Gemini (Google)" };

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

export const AI_IMAGE_ASPECTS = ["16:9", "1:1", "9:16"] as const;
export type AiImageAspect = (typeof AI_IMAGE_ASPECTS)[number];

export const AI_IMAGE_PROMPT_MAX = 2000;

export const AI_IMAGE_STYLE_MAX = 1000;

export type AiImageModelOption = { id: string; label: string };

// Anthropic has no image models; Google Imagen is no longer supported by @ai-sdk/google
export const AI_IMAGE_MODELS: Partial<Record<AiProvider, AiImageModelOption[]>> = {
  openai: [
    { id: "gpt-image-2", label: "GPT Image 2" },
    { id: "gpt-image-1-mini", label: "GPT Image 1 mini" },
  ],
  google: [
    { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image" },
    { id: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image" },
  ],
};

export const isKnownImageModel = (provider: AiProvider, id: string) => AI_IMAGE_MODELS[provider]?.some((m) => m.id === id) ?? false;

export function defaultModelFor(provider: AiProvider, mode: AiThreadMode): string {
  const tier = mode === "live" ? "fast" : "smart";

  return AI_MODELS[provider].find((m) => m.tier === tier)!.id;
}

export const isKnownModel = (provider: AiProvider, id: string) => AI_MODELS[provider].some((m) => m.id === id);

const KIB = 1024;

export const AI_BODY_LIMITS = {
  chat: 64 * KIB,
  contextPreview: 16 * KIB,
  settings: 64 * KIB,
  credentials: 4 * KIB,
  small: 4 * KIB,
  slideImage: 16 * KIB,
} as const;

export const AI_RATE_LIMITS = {
  chat: { limit: 20, windowSeconds: 60 },
  credentials: { limit: 10, windowSeconds: 60 },
  mcp: { limit: 120, windowSeconds: 60 },
  summary: { limit: 10, windowSeconds: 600 },
} as const;

export const AI_LIMITS = {
  messageChars: 8000,
  historyMessages: 30,
  fullToolResultsInLast: 6,
  requestDeadlineMs: 270_000,
  imageGenerationMs: 110_000,
  cancelPollMs: 2500,
  slimOutputChars: 2000,
  toolResultChars: 25_000,
  toolResultJsonChars: 20_000,
  keptReadingChars: 60_000,
  contextChars: 40_000,
  digestChars: 4000,
  digestLeadChars: 90,
  digestEntities: 12,
  maxSteps: 8,
  battleEvents: 10,
  searchHits: 20,
  threadTitleChars: 80,
  instructionsChars: 8000,
  summaryInputChars: 30_000,
} as const;

export const AI_SCENARIO_READ_TOOLS = ["read_scenario_page", "outline_scenario_page", "find_scenario_mentions"] as const;

export const AI_TOOL_OUTPUT_COMPACTED = "[tool result compacted]";

export const API_TOKEN_PREFIX = "dndt_";
export const API_TOKEN_SCOPES = ["ai", "content:read", "content:write", "campaign:read", "campaign:write", "scenario:read", "scenario:write", "characters:read", "characters:write", "battles:read", "battles:write", "show:read", "show:write"] as const;

export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number];

export type ContentScope = "content:read" | "content:write";
export type ActionScope = Exclude<ApiTokenScope, "ai">;

export const CONTENT_SCOPES = ["content:read", "content:write"] as const satisfies readonly ContentScope[];

export const isApiTokenScope = (s: string): s is ApiTokenScope => (API_TOKEN_SCOPES as readonly string[]).includes(s);

type ScopeKey<S extends string> = S extends `${infer A}:${infer B}` ? `${A}${Capitalize<B>}` : S;

export const tokenScopeKey = <S extends ApiTokenScope>(scope: S) => scope.replace(/:(\w)/, (_, c: string) => c.toUpperCase()) as ScopeKey<S>;

export const hasScope = (scopes: readonly string[], need: ApiTokenScope) => scopes.includes(need) || (need.endsWith(":read") && scopes.includes(`${need.slice(0, -5)}:write`));

export const ASSISTANT_PAGE_SIZES = { changes: 20, queue: 20, queueMax: 50 } as const;

// eslint-disable-next-line no-restricted-syntax -- auto-title written by old threads; still recognised for the refetch
export const LEGACY_THREAD_TITLE = "Новий тред";
