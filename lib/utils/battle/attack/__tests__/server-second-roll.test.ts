import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { predictAttack } from "@/lib/utils/battle/attack/bonus";
import { processAttack } from "@/lib/utils/battle/attack/process";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const attacker = () => {
  const p = makeParticipant({ id: "a" });

  return { ...p, battleData: { ...p.battleData, attacks: [sword] } };
};

const semgrun = resolved({
  name: "Семгрун",
  trigger: { event: "attack", phase: "before", role: "target" },
  effects: [{ kind: "flag", flag: "disadvantage", target: "eventActor" }],
});

const marked = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "advantageForAttackers" }] });

const strike = (target: BattleParticipant, rng: () => number, d20 = 18) =>
  processAttack({ attacker: attacker(), target, attack: sword, d20Roll: d20, damageRolls: [4], allParticipants: [attacker(), target], currentRound: 1, battleId: "b", rng });

describe("server-rolled second d20", () => {
  it("Семгрун-style disadvantage without a client roll uses the server roll and logs it", () => {
    const r = strike(makeParticipant({ id: "s", side: ParticipantSide.ENEMY, abilities: [semgrun] }), seq(0.05, 0.5));

    expect(r.attackRoll.secondRoll).toMatchObject({ mode: "disadvantage", serverRolled: true, value: 2 });
    expect(r.attackRoll.isHit).toBe(true);
    expect(r.battleAction.resultText).toContain("недолік: другий d20 = 2");
    expect(r.success).toBe(false);
  });

  it("advantage without a client roll takes the better of two", () => {
    const target = makeParticipant({ id: "s", side: ParticipantSide.ENEMY, abilities: [marked] });

    const r = strike(target, seq(0.9, 0.5), 3);

    expect(r.attackRoll.secondRoll).toMatchObject({ mode: "advantage", serverRolled: true, value: 19 });
    expect(r.success).toBe(true);
  });

  it("predictAttack mode reads advantage/disadvantage flags for the wizard", () => {
    const target = makeParticipant({ id: "s", side: ParticipantSide.ENEMY, abilities: [marked] });

    expect(predictAttack(attacker(), target, sword, [attacker(), target]).mode).toBe("advantage");
    expect(predictAttack(attacker(), makeParticipant({ id: "p", side: ParticipantSide.ENEMY }), sword, [attacker()]).mode).toBe("normal");
  });

  it("predictAttack mode includes certain before-phase triggers, but not chance-based ones", () => {
    const target = makeParticipant({ id: "s", side: ParticipantSide.ENEMY });

    const firstShot = resolved({ trigger: { event: "attack", phase: "before", role: "attacker" }, limits: { perBattle: 1 }, effects: [{ kind: "flag", flag: "advantage", attackKind: "all" }] });

    const lucky = resolved({ trigger: { event: "attack", phase: "before", role: "attacker" }, limits: { chance: 50 }, effects: [{ kind: "flag", flag: "advantage", attackKind: "all" }] });

    const withAbility = (a: typeof firstShot) => {
      const p = makeParticipant({ id: "a", abilities: [a] });

      return { ...p, battleData: { ...p.battleData, attacks: [sword] } };
    };

    expect(predictAttack(withAbility(firstShot), target, sword, [withAbility(firstShot), target]).mode).toBe("advantage");
    expect(predictAttack(withAbility(lucky), target, sword, [withAbility(lucky), target]).mode).toBe("normal");
    expect(predictAttack(attacker(), makeParticipant({ id: "s", side: ParticipantSide.ENEMY, abilities: [semgrun] }), sword, [attacker()]).mode).toBe("disadvantage");
  });
});
