/**
 * Тести Zod runtime parsers для Prisma JSON-полів.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  safeParseOrDefault,
  skillSpellEnhancementDataSchema,
  skillTreeProgressSchema,
  spellEffectsListSchema,
} from "../prisma-json";

describe("skillSpellEnhancementDataSchema", () => {
  it("приймає spellEffectIncrease + spellTargetChange", () => {
    const result = skillSpellEnhancementDataSchema.safeParse({
      spellEffectIncrease: 25,
      spellTargetChange: { target: "all_enemies" },
    });

    expect(result.success).toBe(true);
  });

  it("приймає null для spellEffectIncrease", () => {
    const result = skillSpellEnhancementDataSchema.safeParse({
      spellEffectIncrease: null,
    });

    expect(result.success).toBe(true);
  });
});

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

describe("spellEffectsListSchema", () => {
  it("приймає масив рядків", () => {
    const result = spellEffectsListSchema.safeParse(["a", "b", "c"]);

    expect(result.success).toBe(true);
  });

  it("відхиляє масив з не-рядками", () => {
    const result = spellEffectsListSchema.safeParse(["a", 1, true]);

    expect(result.success).toBe(false);
  });
});

describe("safeParseOrDefault", () => {
  const consoleWarnSpy = vi
    .spyOn(console, "warn")
    .mockImplementation(() => {});

  afterEach(() => {
    consoleWarnSpy.mockClear();
  });

  it("повертає parsed value при success", () => {
    const result = safeParseOrDefault(
      skillSpellEnhancementDataSchema,
      { spellEffectIncrease: 20 },
      {},
      { source: "test" },
    );

    expect(result.spellEffectIncrease).toBe(20);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("повертає defaultValue при invalid input + structured warn", () => {
    const result = safeParseOrDefault(
      skillSpellEnhancementDataSchema,
      { spellEffectIncrease: "багато" },
      { spellEffectIncrease: 0 },
      { source: "test combat stats", skillId: "s1" },
    );

    expect(result).toEqual({ spellEffectIncrease: 0 });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    const [tag, payload] = consoleWarnSpy.mock.calls[0];

    expect(tag).toContain("invalid test combat stats");
    expect(payload).toMatchObject({
      source: "test combat stats",
      skillId: "s1",
    });
    expect(Array.isArray(payload.issues)).toBe(true);
  });

  it("обмежує issues до 5 при надто великій кількості помилок", () => {
    const result = safeParseOrDefault(
      skillTreeProgressSchema,
      {
        a: { level: "x" },
        b: { level: "y" },
        c: { level: "z" },
        d: { level: "w" },
        e: { level: "v" },
        f: { level: "u" },
      },
      {},
      { source: "tree progress" },
    );

    expect(result).toEqual({});

    const [, payload] = consoleWarnSpy.mock.calls[0];

    expect(payload.issues.length).toBeLessThanOrEqual(5);
  });
});
