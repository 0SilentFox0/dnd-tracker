import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import type { BattleAttack } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

describe("guard in a hit", () => {
  it("guardian takes the redirected damage and goes down", () => {
    const attacker = { ...makeParticipant({ id: "a" }), battleData: { ...makeParticipant({ id: "a" }).battleData, attacks: [sword] } };

    const base = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 });

    const target = {
      ...base,
      battleData: {
        ...base.battleData,
        activeEffects: [
          {
            id: "g",
            name: "Щит",
            type: "buff" as const,
            duration: 2,
            appliedAt: { round: 1, timestamp: new Date() },
            effects: [{ type: "guard", value: 100 }],
            abilityKey: "guard",
            source: { participantId: "g", name: "Страж" },
          },
        ],
      },
    };

    const guardian = makeParticipant({ id: "g", side: ParticipantSide.ENEMY, hp: 1, maxHp: 20 });

    const r = processAttack({ attacker, target, attack: sword, d20Roll: 15, damageRolls: [4], allParticipants: [attacker, target, guardian], currentRound: 1, battleId: "b1", rng: seq(0) });

    const g = r.allParticipantsUpdated?.find((p) => p.basicInfo.id === "g");

    expect(g?.combatStats.status).not.toBe("active");
    expect(r.targetUpdated.combatStats.currentHp).toBe(50);
    expect(r.battleAction.hpChanges.find((c) => c.participantId === "g")).toBeDefined();
    expect(r.battleAction.resultText).toContain("🛡");
  });
});
