import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";

const bow = { id: "bow", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d8", damageType: "piercing" };

const forceArrow = resolved({
  name: "Стріла сили",
  trigger: { event: "hit", role: "attacker", attackKind: "ranged" },
  effects: [{ kind: "dealDamage", amount: { percentOf: "eventDamage", value: 50 }, damageType: "piercing", target: "otherEnemy" }],
});

describe("Стріла сили", () => {
  it("влучання дальньою атакою б'є ще одного ворога на 50 % завданої шкоди", () => {
    const base = makeParticipant({ id: "archer", abilities: [forceArrow] });

    const archer = { ...base, battleData: { ...base.battleData, attacks: [bow] } };

    const target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100 });

    const behind = makeParticipant({ id: "b", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100 });

    const r = processAttack({ attacker: archer, target, attack: bow, d20Roll: 15, damageRolls: [8], allParticipants: [archer, target, behind], currentRound: 1, battleId: "b1", rng: seq(0) });

    const hp = (id: string) => r.allParticipantsUpdated?.find((p) => p.basicInfo.id === id)?.combatStats.currentHp ?? 0;

    const dealt = 100 - hp("t");

    expect(dealt).toBeGreaterThan(0);
    expect(100 - hp("b")).toBe(Math.floor(dealt / 2));
  });
});
