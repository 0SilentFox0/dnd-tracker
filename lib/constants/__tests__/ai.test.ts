import { describe, expect, it } from "vitest";

import { AI_MODELS, AI_PROVIDERS, defaultModelFor, isKnownModel } from "@/lib/constants/ai";

describe("AI_MODELS", () => {
  it.each(AI_PROVIDERS)("%s: є fast і smart, id унікальні", (provider) => {
    const models = AI_MODELS[provider];

    expect(models.some((m) => m.tier === "fast")).toBe(true);
    expect(models.some((m) => m.tier === "smart")).toBe(true);
    expect(new Set(models.map((m) => m.id)).size).toBe(models.length);
  });

  it("live бере fast, scenario — smart", () => {
    expect(AI_MODELS.anthropic.find((m) => m.id === defaultModelFor("anthropic", "live"))?.tier).toBe("fast");
    expect(AI_MODELS.anthropic.find((m) => m.id === defaultModelFor("anthropic", "scenario"))?.tier).toBe("smart");
  });

  it("isKnownModel", () => {
    expect(isKnownModel("anthropic", "claude-sonnet-5-5")).toBe(true);
    expect(isKnownModel("anthropic", "gpt-x")).toBe(false);
  });
});
