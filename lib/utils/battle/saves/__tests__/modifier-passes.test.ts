import { describe, expect, it, vi } from "vitest";

import { makeEffect, makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import * as collect from "@/lib/utils/abilities/engine/core/collect-modifiers";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { passivePerception, rollCheck } from "@/lib/utils/battle/checks";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const loaded = (...effects: StaticEffect[]): BattleParticipant => {
  const p = makeParticipant({ id: "t" });

  return { ...p, abilities: { ...p.abilities, proficiencyBonus: 3, skillProficiencies: ["stealth"] }, battleData: { ...p.battleData, activeEffects: [makeEffect("e", { abilityEffects: effects })] } };
};

describe("проходи модифікаторів", () => {
  const spy = vi.spyOn(collect, "collectModifiers");

  it("rollSave — не більше двох проходів і стабільні результати", () => {
    const t = loaded({ kind: "flag", flag: "saveAdvantage", abilities: "all" }, { kind: "flag", flag: "saveProficiency", abilities: ["dexterity"] }, { kind: "modifyStat", stat: "savingThrow", flat: 1 });

    spy.mockClear();

    const r = rollSave({ target: t, ability: "dexterity", dc: 12, participants: [t], rules: DEFAULT_RULES, rng: seq(0.1, 0.9) });

    expect(spy.mock.calls.length).toBeLessThanOrEqual(2);
    expect(r).toMatchObject({ roll: 19, mode: "advantage", bonus: 4 });
  });

  it("rollCheck — не більше двох проходів", () => {
    const t = loaded({ kind: "flag", flag: "checkAdvantage", skills: "all" }, { kind: "flag", flag: "skillExpertise", skills: ["stealth"] });

    spy.mockClear();

    const r = rollCheck({ actor: t, subject: { skill: "stealth" }, participants: [t], rng: seq(0.1, 0.9) });

    expect(spy.mock.calls.length).toBeLessThanOrEqual(2);
    expect(r).toMatchObject({ mode: "advantage", bonus: 6 });
  });

  it("passivePerception — один прохід", () => {
    const t = loaded({ kind: "flag", flag: "checkAdvantage", skills: "all" });

    spy.mockClear();

    expect(passivePerception(t, [t])).toBeGreaterThanOrEqual(15);
    expect(spy.mock.calls.length).toBe(1);
  });
});
