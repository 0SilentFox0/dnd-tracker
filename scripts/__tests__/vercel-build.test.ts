import { describe, expect, it } from "vitest";

import { assertBuildEnv, buildSteps } from "@/scripts/vercel-build.mjs";

const PLACEHOLDER = "postgresql://build:build@127.0.0.1:5432/build?schema=public";

describe("buildSteps", () => {
  it("production: generate з placeholder → migrate deploy → next build", () => {
    const steps = buildSteps({ VERCEL_ENV: "production", DIRECT_URL: "postgresql://x" });

    expect(steps.map((s) => s.cmd)).toEqual([
      "prisma generate",
      "prisma migrate deploy",
      "next build",
    ]);
    expect(steps[0].env).toEqual({ DATABASE_URL: PLACEHOLDER });
    expect(steps[1].timeoutMs).toBe(180_000);
  });

  it("preview не запускає міграції", () => {
    const steps = buildSteps({ VERCEL_ENV: "preview" });

    expect(steps.map((s) => s.cmd)).toEqual(["prisma generate", "next build"]);
  });

  it("локальна збірка без VERCEL_ENV не запускає міграції", () => {
    expect(buildSteps({}).map((s) => s.cmd)).toEqual(["prisma generate", "next build"]);
  });
});

describe("assertBuildEnv", () => {
  it("кидає помилку в production без DIRECT_URL", () => {
    expect(() => assertBuildEnv({ VERCEL_ENV: "production" })).toThrow(/DIRECT_URL/);
  });

  it("кидає помилку в production з порожнім DIRECT_URL", () => {
    expect(() => assertBuildEnv({ VERCEL_ENV: "production", DIRECT_URL: "  " })).toThrow(/DIRECT_URL/);
  });

  it("не вимагає DIRECT_URL для preview", () => {
    expect(() => assertBuildEnv({ VERCEL_ENV: "preview" })).not.toThrow();
  });
});
