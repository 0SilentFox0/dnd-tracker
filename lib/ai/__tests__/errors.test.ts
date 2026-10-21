import { APICallError, RetryError } from "ai";
import { describe, expect, it } from "vitest";

import { aiErrorMessage, aiErrorStatus } from "@/lib/ai/errors";
import { API_ERRORS } from "@/lib/constants/api-errors";

const callError = (statusCode: number, body = "") => new APICallError({ message: `boom sk-ant-SECRET ${body}`, url: "https://api", requestBodyValues: {}, statusCode, responseBody: body, isRetryable: false });

describe("aiErrorMessage", () => {
  it.each([
    [401, API_ERRORS.AI_KEY_INVALID],
    [403, API_ERRORS.AI_KEY_INVALID],
    [429, API_ERRORS.AI_RATE_LIMIT],
    [500, API_ERRORS.AI_PROVIDER_DOWN],
    [529, API_ERRORS.AI_PROVIDER_DOWN],
  ])("%i → текст", (code, text) => {
    expect(aiErrorMessage(callError(code))).toBe(text);
  });

  it("невідома помилка → провайдер недоступний, без тексту оригіналу", () => {
    const msg = aiErrorMessage(new Error("socket hang up sk-ant-SECRET"));

    expect(msg).toBe(API_ERRORS.AI_PROVIDER_DOWN);
    expect(msg).not.toContain("SECRET");
  });

  it("429 у RetryError → ліміт провайдера; 401 теж розгортається", () => {
    const wrap = (e: APICallError) => new RetryError({ message: "Failed after 3 attempts", reason: "maxRetriesExceeded", errors: [e] });

    expect(aiErrorMessage(wrap(callError(429)))).toBe(API_ERRORS.AI_RATE_LIMIT);
    expect(aiErrorStatus(wrap(callError(429)))).toBe(429);
    expect(aiErrorMessage(wrap(callError(401)))).toBe(API_ERRORS.AI_KEY_INVALID);
  });

  it("aiErrorStatus мапить коди", () => {
    expect(aiErrorStatus(callError(401))).toBe(400);
    expect(aiErrorStatus(callError(429))).toBe(429);
    expect(aiErrorStatus(callError(500))).toBe(502);
  });
});
