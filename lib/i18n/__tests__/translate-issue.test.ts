import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { Locale } from "../config";
import { makeT } from "../test/mock-t";
import { translateIssue } from "../translate-issue";

import "../zod-errors";

const getTranslator = async (locale: Locale) =>
  (await vi.importActual<typeof import("../translator")>("../translator")).getTranslator(locale);

describe("translateIssue", () => {
  it("passes minimum to a key", () => {
    expect(translateIssue(makeT("validation"), { message: "minLength", minimum: 8 })).toBe('validation.minLength {"minimum":8}');
  });

  it("returns a legacy raw string as is when t.has is false", () => {
    const t = Object.assign(makeT(), { has: () => false });

    expect(translateIssue(t, { message: "Сирий текст", minimum: 3 })).toBe("Сирий текст");
  });

  it("translates real messages in uk and en", async () => {
    const uk = await getTranslator("uk");

    const en = await getTranslator("en");

    expect(translateIssue(uk, { message: "validation.minLength", minimum: 2 })).toBe("Щонайменше 2 символи");
    expect(translateIssue(en, { message: "validation.minLength", minimum: 2 })).toBe("At least 2 characters");
    expect(translateIssue(en, { message: "validation.maxLength", maximum: 1 })).toBe("At most 1 character");
  });

  it.each([
    [1, "Щонайменше 1 символ"],
    [2, "Щонайменше 2 символи"],
    [5, "Щонайменше 5 символів"],
    [11, "Щонайменше 11 символів"],
    [21, "Щонайменше 21 символ"],
  ])("uk plural for %i", async (minimum, expected) => {
    expect(translateIssue(await getTranslator("uk"), { message: "validation.minLength", minimum })).toBe(expected);
  });
});

describe("zod customError", () => {
  const issueOf = (schema: z.ZodType, value: unknown) => {
    const result = schema.safeParse(value);

    return result.success ? undefined : result.error.issues[0];
  };

  it("maps zod codes to validation keys", () => {
    expect(issueOf(z.string().min(1), "")?.message).toBe("validation.required");
    expect(issueOf(z.string().min(8), "abc")?.message).toBe("validation.minLength");
    expect(issueOf(z.string().max(2), "abc")?.message).toBe("validation.maxLength");
    expect(issueOf(z.string().email(), "x")?.message).toBe("validation.email");
    expect(issueOf(z.string(), 1)?.message).toBe("validation.invalid");
  });

  it("keeps explicit messages", () => {
    expect(issueOf(z.string().min(3, "своє"), "a")?.message).toBe("своє");
  });

  it("end-to-end with the real translator", async () => {
    const issue = issueOf(z.string().min(8), "abc") as { message: string; minimum: number };

    expect(translateIssue(await getTranslator("en"), issue)).toBe("At least 8 characters");
  });
});
