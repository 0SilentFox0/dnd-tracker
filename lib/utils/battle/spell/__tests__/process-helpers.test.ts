/**
 * Тести для spell process-helpers + spell-immunity (CODE_AUDIT 5.8 part).
 *
 * Чисті утиліти, окремий тест файл щоб не змішуватись з calculations.test.ts.
 */

import { describe, expect, it, vi } from "vitest";

import { setParticipantExtras } from "../../participant/extras";
import {
  generateSpellDamageRolls,
  getDiceSize,
} from "../process-helpers";
import { participantImmuneToSpell } from "../spell-immunity";

import {
  createMockParticipant,
} from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

describe("getDiceSize", () => {
  it("parses standard dice notation (d6, d8, d20)", () => {
    expect(getDiceSize("d6")).toBe(6);
    expect(getDiceSize("d8")).toBe(8);
    expect(getDiceSize("d20")).toBe(20);
    expect(getDiceSize("d100")).toBe(100);
  });

  it("uppercase D is also valid", () => {
    expect(getDiceSize("D10")).toBe(10);
  });

  it("returns 6 default for null/undefined/empty", () => {
    expect(getDiceSize(null)).toBe(6);
    expect(getDiceSize(undefined)).toBe(6);
    expect(getDiceSize("")).toBe(6);
  });

  it("returns 6 for malformed non-d strings", () => {
    expect(getDiceSize("garbage")).toBe(6);
    expect(getDiceSize("123")).toBe(6);
  });

  it("clamps minimum to 1", () => {
    expect(getDiceSize("d0")).toBe(1);
  });
});

describe("generateSpellDamageRolls", () => {
  it("generates correct count of rolls", () => {
    const rolls = generateSpellDamageRolls(5, "d6");

    expect(rolls).toHaveLength(5);
  });

  it("each roll within [1, diceSize]", () => {
    const rolls = generateSpellDamageRolls(50, "d6");

    for (const r of rolls) {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });

  it("returns empty array for diceCount=0", () => {
    expect(generateSpellDamageRolls(0, "d6")).toEqual([]);
  });

  it("uses Math.random — deterministic при моку", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    // floor(0.5 * 10) + 1 = 6
    expect(generateSpellDamageRolls(3, "d10")).toEqual([6, 6, 6]);

    spy.mockRestore();
  });

  it("default dice size 6 коли diceType=null", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0);

    // floor(0 * 6) + 1 = 1
    expect(generateSpellDamageRolls(2, null)).toEqual([1, 1]);

    spy.mockRestore();
  });
});

describe("participantImmuneToSpell", () => {
  it("returns false when no extras set", () => {
    const p = createMockParticipant();

    expect(participantImmuneToSpell(p, "spell-1")).toBe(false);
  });

  it("returns false when immuneSpellIds undefined", () => {
    const p = createMockParticipant();

    setParticipantExtras(p, {});

    expect(participantImmuneToSpell(p, "spell-1")).toBe(false);
  });

  it("returns true when spellId in immuneSpellIds", () => {
    const p = createMockParticipant();

    setParticipantExtras(p, { immuneSpellIds: ["spell-1", "spell-2"] });

    expect(participantImmuneToSpell(p, "spell-1")).toBe(true);
    expect(participantImmuneToSpell(p, "spell-2")).toBe(true);
  });

  it("returns false when spellId not in list", () => {
    const p = createMockParticipant();

    setParticipantExtras(p, { immuneSpellIds: ["spell-1"] });

    expect(participantImmuneToSpell(p, "other-spell")).toBe(false);
  });

  it("empty list — not immune", () => {
    const p = createMockParticipant();

    setParticipantExtras(p, { immuneSpellIds: [] });

    expect(participantImmuneToSpell(p, "any")).toBe(false);
  });
});
