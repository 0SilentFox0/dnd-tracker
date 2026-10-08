import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { getCriticalEffect } from "@/lib/constants/critical-effects";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { computeHitDamage } from "@/lib/utils/battle/attack/process/compute";
import type { BattleAttack } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

describe("крок влучання", () => {
  it("processAttack сам не відповідає ударом: ціль із мечем і counterAttack не б'є атакувальника", () => {
    const counter = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: 0 }] });

    const attacker = { ...makeParticipant({ id: "a" }), battleData: { ...makeParticipant({ id: "a" }).battleData, attacks: [sword] } };

    const base = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50, abilities: [counter] });

    const target = { ...base, battleData: { ...base.battleData, attacks: [sword] } };

    const r = processAttack({ attacker, target, attack: sword, d20Roll: 15, damageRolls: [4], allParticipants: [attacker, target], currentRound: 1, battleId: "b1", rng: seq(0) });

    expect(r.attackerUpdated.combatStats.currentHp).toBe(20);
    expect(r.targetUpdated.actionFlags.hasUsedReaction).toBe(false);
  });

  it("bonusPercent множить фізичну шкоду і додає крок «Контратака»", () => {
    const a = makeParticipant({ id: "a" });

    const t = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 });

    const input = { attacker: a, target: t, attack: sword, damageRolls: [4], allParticipants: [a, t], attackRoll: { isCritical: false }, currentRound: 1 };

    const plain = computeHitDamage(input);

    const boosted = computeHitDamage({ ...input, bonusPercent: 50 });

    expect(boosted.physicalDamage).toBe(Math.floor(plain.physicalDamage * 1.5));
    expect(boosted.damageSteps).toContainEqual(expect.objectContaining({ label: "Контратака", kind: "multiplier", value: 1.5 }));
  });

  it("slipping weapon halves physical damage and adds a multiplier step", () => {
    const a = makeParticipant({ id: "a" });

    const weak = {
      ...a,
      battleData: {
        ...a.battleData,
        activeEffects: [{ id: "w", name: "Зброя вислизає", type: "debuff" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [{ type: "weakened_next_hit", value: 0.5 }], consumeOn: "ownHit" as const }],
      },
    };

    const t = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 });

    const input = { target: t, attack: sword, damageRolls: [8], attackRoll: { isCritical: false }, currentRound: 1 };

    const plain = computeHitDamage({ ...input, attacker: a, allParticipants: [a, t] });

    const halved = computeHitDamage({ ...input, attacker: weak, allParticipants: [weak, t] });

    expect(halved.physicalDamage).toBe(Math.floor(plain.physicalDamage * 0.5));
    expect(halved.damageSteps).toContainEqual(expect.objectContaining({ label: "Зброя вислизає", kind: "multiplier", value: 0.5 }));
  });

  describe("фраза критичного ефекту в лозі", () => {
    const setup = () => {
      const attacker = makeParticipant({ id: "a" });

      const target = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 });

      return { attacker, target };
    };

    const names = (a: { basicInfo: { name: string } }, t: { basicInfo: { name: string } }) => ({ attacker: a.basicInfo.name, target: t.basicInfo.name });

    const phrases = (type: "success" | "fail", n: { attacker: string; target: string }) =>
      (getCriticalEffect(6, type)?.flavor ?? []).map((f) => f.replaceAll("{attacker}", n.attacker).replaceAll("{target}", n.target));

    it("крит-влучання: фраза в деталях і в тексті", () => {
      const { attacker, target } = setup();

      const r = processAttack({ attacker, target, attack: sword, d20Roll: 20, damageRolls: [4], allParticipants: [attacker, target], currentRound: 1, battleId: "b1", rng: seq(0.55) });

      const flavor = r.battleAction.actionDetails.criticalEffect?.flavor;

      expect(phrases("success", names(attacker, target))).toContain(flavor);
      expect(r.battleAction.resultText).toContain("Критичне влучання — Безкоштовна атака!");
      expect(r.battleAction.resultText).toContain(flavor);
      expect(r.battleAction.resultText).toContain(`${attacker.basicInfo.name} → `);
    });

    it("крит-невдача: фраза в деталях і в тексті", () => {
      const { attacker, target } = setup();

      const r = processAttack({ attacker, target, attack: sword, d20Roll: 1, damageRolls: [4], allParticipants: [attacker, target], currentRound: 1, battleId: "b1", rng: seq(0.55) });

      const flavor = r.battleAction.actionDetails.criticalEffect?.flavor;

      expect(phrases("fail", names(attacker, target))).toContain(flavor);
      expect(r.battleAction.resultText.startsWith(`${attacker.basicInfo.name}: критична невдача — `)).toBe(true);
      expect(r.battleAction.resultText).toContain(flavor);
    });
  });
});
