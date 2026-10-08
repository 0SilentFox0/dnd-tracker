/**
 * Тести Zod runtime parsers для Prisma JSON-полів.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  safeParseOrDefault,
  skillTreeProgressSchema,
} from "../prisma-json";

describe("skillTreeProgressSchema", () => {
  it("приймає progress зі скілами на рівні expert", () => {
    const result = skillTreeProgressSchema.safeParse({
      "main-chaos": {
        level: "expert",
        unlockedSkills: ["skill-1", "skill-2"],
      },
    });

    expect(result.success).toBe(true);
  });

  it("відхиляє invalid level", () => {
    const result = skillTreeProgressSchema.safeParse({
      "main-x": { level: "ultimate" },
    });

    expect(result.success).toBe(false);
  });
});

describe("safeParseOrDefault", () => {
  const schema = z.object({ level: z.number() });

  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  afterEach(() => {
    consoleWarnSpy.mockClear();
  });

  it("повертає parsed value при success", () => {
    const result = safeParseOrDefault(schema, { level: 20 }, { level: 0 }, { source: "test" });

    expect(result.level).toBe(20);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("повертає defaultValue при invalid input + structured warn", () => {
    const result = safeParseOrDefault(schema, { level: "багато" }, { level: 0 }, { source: "test progress", skillId: "s1" });

    expect(result).toEqual({ level: 0 });
    expect(consoleWarnSpy).toHaveBeenCalledWith("[schema] safeParseOrDefault: invalid test progress", expect.objectContaining({ source: "test progress", skillId: "s1" }));
  });
});
