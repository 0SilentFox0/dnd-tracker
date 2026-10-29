import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { textOf } from "@/lib/i18n/test/text";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { runEscape } from "@/lib/utils/battle/actions/grapple";
import { removeEffects } from "@/lib/utils/battle/conditions";
import { applyResistance } from "@/lib/utils/battle/resistance";
import { bestSaveAbility } from "@/lib/utils/battle/saves";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const map: BattleMapConfig = { cols: 20, rows: 10, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, x: number): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position: { x, y: 5 } } });

const withMods = (p: BattleParticipant, modifiers: Partial<BattleParticipant["abilities"]["modifiers"]>): BattleParticipant => ({ ...p, abilities: { ...p.abilities, modifiers: { ...p.abilities.modifiers, ...modifiers } } });

const effects: SpellEffect[] = [
  { kind: "applyCondition", condition: "grappled", duration: { rounds: 10 }, escapeDc: true },
  { kind: "dot", damagePerRound: "1d8", damageType: "necrotic", duration: { rounds: 10 }, linkedToCondition: true },
];

const grasp = (orAbility?: "dexterity"): CastableSpell => ({
  id: "sp",
  name: "Синтетична хватка",
  level: 2,
  groupId: null,
  definition: { dice: 0, cost: "action", targeting: { kind: "enemy", range: 30 }, resolution: { kind: "save", ability: "strength", ...(orAbility && { orAbility }), onSuccess: "none" }, effects, raceModifiers: [] },
});

const cast = (dc: number, target = at(makeParticipant({ id: "f", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 }), 2)) => {
  const base = at(makeParticipant({ id: "c" }), 0);

  const c = { ...base, spellcasting: { ...base.spellcasting, spellSaveDC: dc, spellSlots: { "2": { max: 2, current: 2 } } } };

  return castSpell({ caster: c, spell: grasp("dexterity"), targetIds: ["f"], allParticipants: [c, target], currentRound: 1, battleId: "b", diceRolls: [], rng: () => 0.5, map });
};

const foeOf = (ps: BattleParticipant[] | undefined) => ps?.find((p) => p.basicInfo.id === "f") as BattleParticipant;

describe("grasp: escapeDc + linked DoT", () => {
  it("failed save grapples, stores the spell DC and a DoT linked to the condition", () => {
    const f = foeOf(cast(30).allParticipantsUpdated);

    const grappled = f.battleData.activeEffects.find((e) => e.type === "condition");

    const dot = f.battleData.activeEffects.find((e) => e.dotDamage);

    expect(grappled?.escapeDc).toBe(30);
    expect(dot?.linkedTo).toBe(grappled?.id);
  });

  it("a saved target gets neither the grapple nor the DoT", () => {
    const f = foeOf(cast(1).allParticipantsUpdated);

    expect(f.battleData.activeEffects).toEqual([]);
  });

  it("removeEffects on the condition drops the linked DoT in one pass", () => {
    const f = foeOf(cast(30).allParticipantsUpdated);

    const { participant, removed } = removeEffects(f, (e) => e.type === "condition");

    expect(removed).toHaveLength(2);
    expect(participant.battleData.activeEffects).toEqual([]);
  });

  it("Escape rolls against the stored DC and frees from both", () => {
    const ps = cast(30).allParticipantsUpdated as BattleParticipant[];

    const caster = ps.find((p) => p.basicInfo.id === "c") as BattleParticipant;

    const f = foeOf(ps);

    const lowDc = { ...f, battleData: { ...f.battleData, activeEffects: f.battleData.activeEffects.map((e) => (e.escapeDc ? { ...e, escapeDc: 1 } : e)) } };

    const rules = { ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true } };

    const free = runEscape({ actor: lowDc, participants: [caster, lowDc], rules, rng: () => 0.5, map, round: 2 });

    expect(textOf(free.message)).toContain("проти СК 1");
    expect(free.participants.find((p) => p.basicInfo.id === "f")?.battleData.activeEffects).toEqual([]);

    const stuck = runEscape({ actor: f, participants: [caster, f], rules, rng: () => 0.5, map, round: 2 });

    expect(textOf(stuck.message)).toContain("не вдалося");
    expect(foeOf(stuck.participants).battleData.activeEffects).toHaveLength(2);
  });

  it("the grapple survives the caster stepping away", () => {
    const ps = cast(30).allParticipantsUpdated as BattleParticipant[];

    expect(foeOf(ps).battleData.activeEffects.every((e) => !e.abilityKey?.startsWith("core:grapple:"))).toBe(true);
  });
});

describe("bestSaveAbility", () => {
  const t = withMods(createMockParticipant(), { strength: 0, dexterity: 3 });

  it("picks the higher bonus, ties keep the first", () => {
    expect(bestSaveAbility(t, ["strength", "dexterity"], [t])).toBe("dexterity");
    expect(bestSaveAbility(withMods(t, { strength: 3 }), ["strength", "dexterity"], [t])).toBe("strength");
  });
});

describe("damageThreshold", () => {
  const tough = grantPassive(createMockParticipant(), [{ kind: "flag", flag: "damageThreshold", value: 15 }], "Панцир");

  it("14 becomes 0, 15 goes through", () => {
    expect(applyResistance(tough, 14, "slashing").finalDamage).toBe(0);
    expect(applyResistance(tough, 15, "slashing").finalDamage).toBe(15);
  });

  it("applies after resistance", () => {
    const resistant = grantPassive(tough, [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }], "Опір");

    expect(applyResistance(resistant, 28, "fire").finalDamage).toBe(0);
    expect(applyResistance(resistant, 30, "fire").finalDamage).toBe(15);
  });

  it("no threshold means no change", () => {
    expect(applyResistance(createMockParticipant(), 1, "fire").finalDamage).toBe(1);
  });
});
