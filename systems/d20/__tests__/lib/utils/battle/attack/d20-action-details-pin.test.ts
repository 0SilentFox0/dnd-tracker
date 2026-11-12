import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { diceThrowsOf } from "@/lib/utils/battle/fx/dice";
import { castSpell } from "@/lib/utils/battle/spell";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import type { BattleAttack } from "@/types/battle";

const base = createMockParticipant();

const hero = createMockParticipant({ abilities: { ...base.abilities, level: 5, damageModel: "5e", strength: 14, modifiers: { ...base.abilities.modifiers, strength: 2 } } });

const target = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "t1", side: ParticipantSide.ENEMY }, combatStats: { ...base.combatStats, currentHp: 99, maxHp: 99 } });

const sword: BattleAttack = { id: "s", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "slashing" };

const strike = (d20: number) =>
  processAttack({ attacker: hero, target, attack: sword, d20Roll: d20, damageRolls: [5], allParticipants: [hero, target], currentRound: 1, battleId: "b1", recordDice: true, rng: () => 0.5, rules: DEFAULT_RULES }).battleAction;

const HIT = {"weaponName":"Sword","attackKind":"melee","attackRoll":15,"attackBonus":4,"totalAttackValue":19,"targetAC":14,"isHit":true,"isCritical":false,"isCriticalFail":false,"damageRolls":[{"dice":"1d8","results":[5],"total":5,"damageType":"slashing"}],"totalDamage":7,"damageRows":[{"label":{"message":"battleLog.damage.rows.dice"},"value":"5","tone":"step"},{"label":{"message":"gameTerms.abilities.strength.label"},"value":"+2","tone":"step"},{"label":{"message":"battleLog.damage.rows.base"},"value":"7","tone":"total"},{"label":"","tone":"rule"},{"label":{"message":"battleLog.damage.rows.sum"},"value":"7","tone":"total"}],"damageSteps":{"t1":[{"label":{"message":"battleLog.damage.steps.dice"},"side":"attacker","kind":"dice","value":5,"after":5},{"label":{"message":"gameTerms.abilities.strength.label"},"side":"attacker","kind":"flat","value":2,"after":7}]},"diceRolls":[{"kind":"attack","rollerId":"p1","targetId":"t1","dice":[{"sides":20,"value":15}]},{"kind":"damage","rollerId":"p1","targetId":"t1","dice":[{"sides":8,"value":5}]}]};

const MISS = {"weaponName":"Sword","attackKind":"melee","attackRoll":2,"attackBonus":4,"totalAttackValue":6,"targetAC":14,"isHit":false,"isCritical":false,"isCriticalFail":false,"diceRolls":[{"kind":"attack","rollerId":"p1","targetId":"t1","dice":[{"sides":20,"value":2}]}]};

const THROWS = [{"seed":0,"groups":[[{"sides":20,"value":15}]]},{"seed":2,"groups":[[{"sides":8,"value":5}]]}];

const CAST = {"spellId":"sp","spellName":"Bolt","spellLevel":1,"spellDamageType":"fire","spellTargeting":"enemy","spellEffectKinds":["dealDamage"],"spellSlotUsed":1,"totalDamage":6,"damageRows":[{"label":{"message":"battleLog.damage.rows.dice"},"value":"6","tone":"step"}],"damageSteps":{"e1":[]}};

const json = (v: unknown) => JSON.parse(JSON.stringify(v));

const cast = () => {
  const c = makeParticipant({ id: "c" });

  const caster = { ...c, spellcasting: { ...c.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };

  const e = makeParticipant({ id: "e1", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 });

  const spell = { id: "sp", name: "Bolt", level: 1, groupId: "chaos", definition: { dice: 2, cost: "action" as const, targeting: { kind: "enemy" as const }, resolution: { kind: "auto" as const }, effects: [{ kind: "dealDamage" as const, amount: { spellRoll: 100 }, damageType: "fire" }], raceModifiers: [] } };

  return castSpell({ rules: DEFAULT_RULES, caster, spell, targetIds: ["e1"], allParticipants: [caster, e], currentRound: 1, battleId: "b", diceRolls: [3, 3], rng: seq(0.5) }).battleAction;
};

describe("d20 action details stay byte-identical (E1 2.4, P8)", () => {
  it("attack hit and miss carry no system fields", () => {
    expect(json(strike(15).actionDetails)).toEqual(HIT);
    expect(json(strike(2).actionDetails)).toEqual(MISS);
    expect(Object.keys(strike(15).actionDetails)).not.toContain("system");
  });

  it("spell details are unchanged", () => expect(json(cast().actionDetails)).toEqual(CAST));

  it("diceThrowsOf of a d20 action is unchanged", () => {
    expect(json(diceThrowsOf(strike(15)))).toEqual(THROWS);
    expect(diceThrowsOf(cast())).toEqual([]);
  });
});
