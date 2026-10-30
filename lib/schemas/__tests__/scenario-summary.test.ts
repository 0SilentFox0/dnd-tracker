import { describe, expect, it } from "vitest";

import { pageSummarySchema, SUMMARY_LIMITS } from "../scenario-summary";

const valid = { overview: "Overview", events: ["Event"], secrets: ["Secret"], entities: ["unit:1"], digest: "Digest" };

describe("pageSummarySchema", () => {
  it("accepts a valid summary", () => {
    expect(pageSummarySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts values at the limits", () => {
    const edge = {
      overview: "a".repeat(SUMMARY_LIMITS.overview),
      events: Array(SUMMARY_LIMITS.events).fill("a".repeat(SUMMARY_LIMITS.event)),
      secrets: Array(SUMMARY_LIMITS.secrets).fill("a".repeat(SUMMARY_LIMITS.secret)),
      entities: Array(SUMMARY_LIMITS.entities).fill("unit:1"),
      digest: "a".repeat(SUMMARY_LIMITS.digest),
    };

    expect(pageSummarySchema.safeParse(edge).success).toBe(true);
  });

  it.each([
    ["overview", { overview: "a".repeat(601) }],
    ["events count", { events: Array(9).fill("e") }],
    ["event length", { events: ["a".repeat(161)] }],
    ["secrets count", { secrets: Array(6).fill("s") }],
    ["secret length", { secrets: ["a".repeat(201)] }],
    ["entities count", { entities: Array(21).fill("unit:1") }],
    ["digest", { digest: "a".repeat(301) }],
  ])("rejects oversized %s", (_name, patch) => {
    expect(pageSummarySchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it("rejects an empty object", () => {
    expect(pageSummarySchema.safeParse({}).success).toBe(false);
  });
});
