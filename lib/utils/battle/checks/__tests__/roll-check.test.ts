import { describe, expect, it } from "vitest";

import { makeEffect, makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { passivePerception, rollCheck } from "@/lib/utils/battle/checks";
import { parseRules } from "@/lib/utils/rules/schema";
import type { BattleParticipant } from "@/types/battle";

const base = (skillProficiencies?: BattleParticipant["abilities"]["skillProficiencies"]): BattleParticipant => {
  const p = makeParticipant({ id: "a" });

  return { ...p, abilities: { ...p.abilities, proficiencyBonus: 3, skillProficiencies, modifiers: { ...p.abilities.modifiers, dexterity: 2, wisdom: 1, strength: 4 } } };
};

const withEffects = (p: BattleParticipant, ...effects: StaticEffect[]): BattleParticipant => ({
  ...p,
  battleData: { ...p.battleData, activeEffects: [makeEffect("e", { abilityEffects: effects })] },
});

const withExhaustion = (p: BattleParticipant, level: number, variant: "2014" | "2024"): BattleParticipant => ({
  ...p,
  battleData: { ...p.battleData, activeEffects: [makeEffect("x", { effects: [{ type: "exhaustion", value: level }], exhaustionVariant: variant })] },
});

const run = (actor: BattleParticipant, subject: Parameters<typeof rollCheck>[0]["subject"], over: Partial<Parameters<typeof rollCheck>[0]> = {}) =>
  rollCheck({ actor, subject, participants: [actor], rng: seq(0.1, 0.9), ...over });

describe("rollCheck", () => {
  it("навичка бере характеристику з DND_SKILL_META", () => {
    expect(run(base(), { skill: "stealth" })).toMatchObject({ roll: 3, mod: 2, bonus: 0, total: 5, mode: "normal" });
  });

  it("майстерність з skillProficiencies і з прапорця", () => {
    expect(run(base(["stealth"]), { skill: "stealth" })).toMatchObject({ bonus: 3, total: 8 });
    expect(run(withEffects(base(), { kind: "flag", flag: "skillProficiency", skills: ["stealth"] }), { skill: "stealth" })).toMatchObject({ bonus: 3 });
  });

  it("характеристика без майстерності", () => {
    expect(run(base(["stealth"]), { ability: "strength" })).toMatchObject({ mod: 4, bonus: 0, total: 7 });
  });

  it("checkAdvantage all — більший з двох, checkDisadvantage — менший", () => {
    expect(run(withEffects(base(), { kind: "flag", flag: "checkAdvantage", skills: "all" }), { skill: "stealth" })).toMatchObject({ mode: "advantage", rolls: [3, 19], roll: 19 });
    expect(run(withEffects(base(), { kind: "flag", flag: "checkDisadvantage", skills: ["stealth"] }), { skill: "stealth" })).toMatchObject({ mode: "disadvantage", roll: 3 });
    expect(run(withEffects(base(), { kind: "flag", flag: "checkDisadvantage", skills: ["stealth"] }), { skill: "arcana" })).toMatchObject({ mode: "normal" });
  });

  it("перевага й недолік скасовують одне одного", () => {
    const p = withEffects(base(), { kind: "flag", flag: "checkAdvantage", skills: "all" }, { kind: "flag", flag: "checkDisadvantage", skills: "all" });

    expect(run(p, { skill: "stealth" })).toMatchObject({ mode: "normal", rolls: [3] });
  });

  it("виснаження 2014 рівня 1 — перешкода", () => {
    expect(run(withExhaustion(base(), 1, "2014"), { skill: "stealth" })).toMatchObject({ mode: "disadvantage", roll: 3 });
  });

  it("виснаження 2024 рівня 2 — бонус -4, з правил кампанії теж", () => {
    expect(run(withExhaustion(base(), 2, "2024"), { skill: "stealth" })).toMatchObject({ bonus: -4, mode: "normal" });

    const p = { ...base(), battleData: { ...base().battleData, activeEffects: [makeEffect("x", { effects: [{ type: "exhaustion", value: 2 }] })] } };

    expect(run(p, { skill: "stealth" }, { rules: parseRules({ conditions: { enabled: true, exhaustion: "2024" } }) })).toMatchObject({ bonus: -4 });
  });

  it("presetRoll — перший кубик", () => {
    expect(run(withEffects(base(), { kind: "flag", flag: "checkAdvantage", skills: "all" }), { skill: "stealth" }, { presetRoll: 20, rng: seq(0.1) })).toMatchObject({ rolls: [20, 3], roll: 20 });
  });
});

describe("passivePerception", () => {
  it("10 + мод + майстерність", () => {
    expect(passivePerception(base(), [base()])).toBe(11);
    expect(passivePerception(base(["perception"]), [base()])).toBe(14);
  });

  it("перевага +5, недолік -5", () => {
    expect(passivePerception(withEffects(base(), { kind: "flag", flag: "checkAdvantage", skills: ["perception"] }), [])).toBe(16);
    expect(passivePerception(withEffects(base(), { kind: "flag", flag: "checkDisadvantage", skills: "all" }), [])).toBe(6);
  });

  it("виснаження: 2014 — перешкода (-5), 2024 — -2 за рівень без -5", () => {
    expect(passivePerception(withExhaustion(base(), 1, "2014"), [])).toBe(6);
    expect(passivePerception(withExhaustion(base(), 2, "2024"), [])).toBe(7);
  });

  it("варіант виснаження береться з правил кампанії", () => {
    const p = { ...base(), battleData: { ...base().battleData, activeEffects: [makeEffect("x", { effects: [{ type: "exhaustion", value: 2 }] })] } };

    expect(passivePerception(p, [], parseRules({ conditions: { enabled: true, exhaustion: "2024" } }))).toBe(7);
  });
});
