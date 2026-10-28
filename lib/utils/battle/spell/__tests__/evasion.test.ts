import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeEffect, makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { evasionFactor, hasEvasion } from "@/lib/utils/battle/saves/evasion";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { SpellDefinition } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

const fire: Effect = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

const spellOf = (over: Partial<SpellDefinition> = {}): CastableSpell => ({
  id: "sp",
  name: "Fireball",
  level: 1,
  groupId: "evo",
  definition: { dice: 2, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, effects: [fire], raceModifiers: [], ...over },
});

const caster = () => {
  const p = makeParticipant({ id: "c" });

  return { ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };
};

const rogue = (incapacitated = false): BattleParticipant => {
  const p = grantPassive(makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 }), [{ kind: "flag", flag: "evasion" }], "Evasion");

  return incapacitated ? { ...p, battleData: { ...p.battleData, activeEffects: [makeEffect("stun", { effects: [{ type: "incapacitated", value: 1 }] as never })] } } : p;
};

const hpAfter = (target: BattleParticipant, roll: number, spell = spellOf()) => {
  const c = caster();

  const r = castSpell({ caster: c, spell, targetIds: ["e"], allParticipants: [c, target], currentRound: 1, battleId: "b", diceRolls: [3, 3], saveRolls: [{ participantId: "e", roll }], rng: seq(0.5) });

  return r.allParticipantsUpdated.find((p) => p.basicInfo.id === "e")?.combatStats.currentHp;
};

describe("evasion", () => {
  it("success → no damage, failure → half", () => {
    expect(hpAfter(rogue(), 20)).toBe(200);
    expect(hpAfter(rogue(), 1)).toBe(197);
  });

  it("incapacitated loses evasion", () => {
    expect(hpAfter(rogue(true), 20)).toBe(197);
    expect(hasEvasion([rogue(true)], rogue(true))).toBe(false);
  });

  it("only Dexterity saves with half on success", () => {
    expect(hpAfter(rogue(), 1, spellOf({ resolution: { kind: "save", ability: "constitution", onSuccess: "half" } }))).toBe(194);
    expect(hpAfter(rogue(), 1, spellOf({ resolution: { kind: "save", ability: "dexterity", onSuccess: "none" } }))).toBe(194);
  });

  it("evasionFactor keeps the old factors without evasion", () => {
    expect([evasionFactor(true, false), evasionFactor(false, false), evasionFactor(true, true), evasionFactor(false, true)]).toEqual([0.5, 1, 0, 0.5]);
  });
});
