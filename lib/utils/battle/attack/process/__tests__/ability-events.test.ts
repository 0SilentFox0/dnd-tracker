import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

function attack(attacker: BattleParticipant, target: BattleParticipant, d20 = 15, others: BattleParticipant[] = []) {
  return processAttack({ attacker: { ...attacker, battleData: { ...attacker.battleData, attacks: [sword] } }, target, attack: sword, d20Roll: d20, damageRolls: [4], allParticipants: [attacker, target, ...others], currentRound: 1, battleId: "b1", rng: seq(0) });
}

describe("ability events in attack", () => {
  it("before-бонус шкоди діє на цю атаку і не лишається", () => {
    const fury = resolved({ trigger: { event: "attack", phase: "before", role: "attacker" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, flat: 3 }] });

    const r = attack(makeParticipant({ id: "a", abilities: [fury] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 }));

    const plain = attack(makeParticipant({ id: "a" }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 }));

    expect((r.damage?.finalDamage ?? 0) - (plain.damage?.finalDamage ?? 0)).toBe(3);
    expect(r.attackerUpdated.battleData.activeEffects).toHaveLength(0);
  });

  it("hit: DOT на ціль, шипи цілі б'ють атакувальника", () => {
    const bleed = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: 2, damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] });

    const thorns = resolved({ trigger: { event: "hit", role: "target" }, effects: [{ kind: "dealDamage", amount: 1, target: "eventActor" }] }, { id: "t" });

    const r = attack(makeParticipant({ id: "a", abilities: [bleed] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50, abilities: [thorns] }));

    expect(r.targetUpdated.battleData.activeEffects[0].dotDamage).toEqual({ damagePerRound: 2, damageType: "bleed" });
    expect(r.attackerUpdated.combatStats.currentHp).toBe(19);
    expect(r.battleAction.resultText).toContain("🔥");
  });

  it("летальна шкода: виживання з 1 HP; інакше kill і мораль союзників", () => {
    const survive = resolved({ trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: 1, revive: true }] });

    const r1 = attack(makeParticipant({ id: "a" }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 2, abilities: [survive] }));

    expect(r1.targetUpdated.combatStats).toMatchObject({ currentHp: 1, status: "active" });

    const mourn = resolved({ trigger: { event: "kill", role: "victimSide" }, effects: [{ kind: "changeMorale", delta: -1 }] }, { id: "m" });

    const ally = makeParticipant({ id: "e2", side: ParticipantSide.ENEMY, abilities: [mourn] });

    const r2 = attack(makeParticipant({ id: "a" }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 2 }), 15, [ally]);

    expect(r2.allParticipantsUpdated?.find((p) => p.basicInfo.id === "e2")?.combatStats.morale).toBe(-1);
  });

  it("ціль загинула від before-ефекту — атака не кидається, kill один раз", () => {
    const bolt = resolved({ trigger: { event: "attack", phase: "before", role: "attacker" }, effects: [{ kind: "dealDamage", amount: 99, target: "eventTarget" }] });

    const glory = resolved({ trigger: { event: "kill", role: "killer" }, effects: [{ kind: "changeMorale", delta: 1 }] }, { id: "g" });

    const r = attack(makeParticipant({ id: "a", abilities: [bolt, glory] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY }));

    expect(r.damage).toBeUndefined();
    expect(r.attackerUpdated.combatStats.morale).toBe(1);
  });

  it("guaranteedHit влучає попри AC", () => {
    const sure = resolved({ trigger: { event: "attack", phase: "before", role: "attacker" }, effects: [{ kind: "flag", flag: "guaranteedHit" }] });

    const r = attack(makeParticipant({ id: "a", abilities: [sure] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 }), 2);

    expect(r.success).toBe(true);
  });
});
