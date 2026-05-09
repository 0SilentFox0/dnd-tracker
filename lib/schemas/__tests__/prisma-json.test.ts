/**
 * Тести Zod runtime parsers для Prisma JSON-полів.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  safeParseOrDefault,
  skillCombatStatsSchema,
  skillSpellEnhancementDataSchema,
  skillTreeProgressSchema,
  spellEffectsListSchema,
} from "../prisma-json";

describe("skillCombatStatsSchema", () => {
  it("приймає валідну combatStats з effects", () => {
    const result = skillCombatStatsSchema.safeParse({
      effects: [
        {
          stat: "melee_damage",
          type: "percent",
          value: 25,
          isPercentage: true,
        },
      ],
      affectsDamage: true,
      damageType: "melee",
    });

    expect(result.success).toBe(true);
  });

  it("приймає damageType=null", () => {
    const result = skillCombatStatsSchema.safeParse({
      damageType: null,
    });

    expect(result.success).toBe(true);
  });

  it("приймає damageType=magic", () => {
    const result = skillCombatStatsSchema.safeParse({
      damageType: "magic",
      effects: [
        { stat: "chaos_spell_damage", value: 25, isPercentage: true },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("відхиляє invalid damageType", () => {
    const result = skillCombatStatsSchema.safeParse({
      damageType: "fire",
    });

    expect(result.success).toBe(false);
  });

  it("приймає порожній об'єкт", () => {
    const result = skillCombatStatsSchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });

  it("passthrough — зберігає невідомі поля", () => {
    const input = { effects: [], customField: "preserved" };

    const result = skillCombatStatsSchema.safeParse(input);

    expect(result.success).toBe(true);
    expect((result.data as { customField?: string }).customField).toBe(
      "preserved",
    );
  });
});

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
      skillCombatStatsSchema,
      { affectsDamage: true },
      {},
      { source: "test" },
    );

    expect(result.affectsDamage).toBe(true);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("повертає defaultValue при invalid input + structured warn", () => {
    const result = safeParseOrDefault(
      skillCombatStatsSchema,
      { damageType: "fire" }, // invalid enum
      { affectsDamage: false },
      { source: "test combat stats", skillId: "s1" },
    );

    expect(result).toEqual({ affectsDamage: false });

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
