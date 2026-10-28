import { describe, expect, it } from "vitest";

import { aiMapRequestSchema, contentImportSchema } from "@/lib/schemas/content-import";

describe("contentImportSchema", () => {
  it("режим за замовчуванням create, dryRun false", () => {
    expect(contentImportSchema.parse({ rows: [{ name: "А" }] })).toEqual({ rows: [{ name: "А" }], mode: "create", dryRun: false });
  });

  it("0 і 501 рядок — помилка; 500 — гаразд", () => {
    expect(contentImportSchema.safeParse({ rows: [] }).success).toBe(false);
    expect(contentImportSchema.safeParse({ rows: Array.from({ length: 501 }, () => ({ name: "А" })) }).success).toBe(false);
    expect(contentImportSchema.safeParse({ rows: Array.from({ length: 500 }, () => ({ name: "А" })) }).success).toBe(true);
  });

  it("невідомий режим — помилка", () => expect(contentImportSchema.safeParse({ rows: [{}], mode: "merge" }).success).toBe(false));
});

describe("aiMapRequestSchema", () => {
  it("до 5 рядків прикладу, клітинки до 200 символів", () => {
    expect(aiMapRequestSchema.safeParse({ headers: ["A"], sample: Array.from({ length: 6 }, () => ({ A: "1" })) }).success).toBe(false);
    expect(aiMapRequestSchema.safeParse({ headers: ["A"], sample: [{ A: "x".repeat(201) }] }).success).toBe(false);
    expect(aiMapRequestSchema.safeParse({ headers: ["A"], sample: [{ A: "1" }] }).success).toBe(true);
  });
});
