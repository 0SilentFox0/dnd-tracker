import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { ImageModel, LanguageModel } from "ai";

import "server-only";
import type { AiProvider } from "@/lib/constants/ai";

export function createModel(provider: AiProvider, apiKey: string, modelId: string): LanguageModel {
  if (provider === "anthropic") return createAnthropic({ apiKey })(modelId);

  if (provider === "openai") return createOpenAI({ apiKey })(modelId);

  return createGoogleGenerativeAI({ apiKey })(modelId);
}

export function createImageModel(provider: AiProvider, apiKey: string, modelId: string): ImageModel {
  if (provider === "openai") return createOpenAI({ apiKey }).image(modelId);

  if (provider === "google") return createGoogleGenerativeAI({ apiKey }).image(modelId);

  throw new Error(`No image models for ${provider}`);
}

// listing models is free on all three providers and fails fast on a bad key
const VERIFY: Record<AiProvider, (key: string) => Request> = {
  anthropic: (key) => new Request("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" } }),
  openai: (key) => new Request("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${key}` } }),
  google: (key) => new Request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": key } }),
};

export async function verifyProviderKey(provider: AiProvider, apiKey: string): Promise<"ok" | "invalid" | "unreachable"> {
  try {
    const res = await fetch(VERIFY[provider](apiKey), { signal: AbortSignal.timeout(10_000), cache: "no-store" });

    if (res.ok) return "ok";

    return res.status === 401 || res.status === 403 || res.status === 400 ? "invalid" : "unreachable";
  } catch {
    return "unreachable";
  }
}
