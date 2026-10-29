import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { defineTool, runToolResult } from "@/lib/ai/tools/define";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";

vi.mock("server-only", () => ({}));

const ctx = { campaignId: "c", userId: "u", scopes: [], threadId: null, locale: "uk" as const } as never;

const failing = (error: unknown) => defineTool({ name: "x", scopes: [], title: "x", description: "x", input: z.object({ n: z.number() }), handler: async () => { throw error; } });

describe("runToolResult translation", () => {
  it("translates the ContentError message with its params and the issue messages", async () => {
    const error = new ContentError(API_ERRORS.INITIATIVE_OUT_OF_RANGE_DETAIL, 400, [{ path: ["a"], code: "too_small", message: API_ERRORS.FORBIDDEN, minimum: 3 }], { min: 1, max: 5 });

    const result = await runToolResult(failing(error), ctx, { n: 5 });

    expect(result).toMatchObject({
      kind: "error",
      error: { message: `${API_ERRORS.INITIATIVE_OUT_OF_RANGE_DETAIL} {"min":1,"max":5}`, issues: [`- a: ${API_ERRORS.FORBIDDEN} {"minimum":3}`] },
    });
  });

  it("translates zod issue messages", async () => {
    const result = await runToolResult(failing(new Error("unused")), ctx, { n: "x" });

    expect(result).toMatchObject({ kind: "error", error: { code: "INVALID_INPUT", message: "Некоректні параметри" } });
  });
});
