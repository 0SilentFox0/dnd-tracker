import { describe, expect, it } from "vitest";
import { z } from "zod";

import { zodErrorMap } from "../zod-errors";

const messageOf = (schema: z.ZodType, value: unknown, error?: typeof zodErrorMap) => {
  const result = schema.safeParse(value, error ? { error } : undefined);

  return result.success ? undefined : result.error.issues[0].message;
};

describe("zodErrorMap", () => {
  it("number bounds map to min/max", () => {
    expect(messageOf(z.number().min(3), 1, zodErrorMap)).toBe("validation.min");
    expect(messageOf(z.number().max(5), 9, zodErrorMap)).toBe("validation.max");
    expect(messageOf(z.number().int().min(1), 0, zodErrorMap)).toBe("validation.min");
  });

  it("string bounds keep required/minLength/maxLength", () => {
    expect(messageOf(z.string().min(1), "", zodErrorMap)).toBe("validation.required");
    expect(messageOf(z.string().min(3), "a", zodErrorMap)).toBe("validation.minLength");
    expect(messageOf(z.string().max(2), "abc", zodErrorMap)).toBe("validation.maxLength");
  });

  it("enum mismatch and unknown codes map to invalid", () => {
    expect(messageOf(z.enum(["a"]), "b", zodErrorMap)).toBe("validation.invalid");
    expect(messageOf(z.string().refine(() => false), "x", zodErrorMap)).toBe("validation.invalid");
    expect(messageOf(z.strictObject({}), { x: 1 }, zodErrorMap)).toBe("validation.invalid");
  });

  it("explicit schema messages win", () => {
    expect(messageOf(z.number().min(3, "своє"), 1, zodErrorMap)).toBe("своє");
  });

  it("always returns a message", () => {
    expect(zodErrorMap({ code: "whatever" })).toEqual({ message: "validation.invalid" });
  });
});

describe("server locale registration", () => {
  it("global config yields keys instead of zod's own texts", async () => {
    await import("@/lib/zod/locale");

    expect(messageOf(z.number().min(3), 1)).toBe("validation.min");
    expect(messageOf(z.enum(["a"]), "b")).toBe("validation.invalid");
    expect(messageOf(z.string().min(1), "")).toBe("validation.required");
    expect(messageOf(z.number().min(3, "своє"), 1)).toBe("своє");
  });
});
