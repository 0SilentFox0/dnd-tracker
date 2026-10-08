import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { FlagKey } from "@/lib/utils/abilities/schema";
import { resolveRetaliation } from "@/lib/utils/battle/attack/retaliation";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

function unit(id: string, side: ParticipantSide, flag?: FlagKey, usedReaction = false): BattleParticipant {
  const abilities = flag ? [resolved({ id: flag, trigger: { event: "passive" }, effects: [{ kind: "flag", flag } as never] })] : undefined;

  const p = makeParticipant({ id, side, hp: 30, maxHp: 30, abilities });

  return {
    ...p,
    basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT },
    battleData: { ...p.battleData, attacks: [sword] },
    actionFlags: { ...p.actionFlags, hasUsedReaction: usedReaction },
  };
}

const run = (a: BattleParticipant, d: BattleParticipant) =>
  resolveRetaliation({ participants: [a, d], attackerId: "a", defenderId: "d", attack: sword, attackRoll: { isCriticalFail: false }, round: 1, battleId: "b1", rng: seq(0.85) });

describe("прапори відсічі", () => {
  it("без відповіді: атакувальник з noRetaliation не отримує відсічі", () => {
    expect(run(unit("a", ParticipantSide.ALLY, "noRetaliation"), unit("d", ParticipantSide.ENEMY))).toBeNull();
  });

  it("безмежна відсіч: відповідає вдруге за раунд", () => {
    expect(run(unit("a", ParticipantSide.ALLY), unit("d", ParticipantSide.ENEMY, "unlimitedRetaliation", true))).not.toBeNull();
  });

  it("без відповіді перемагає безмежну відсіч", () => {
    expect(run(unit("a", ParticipantSide.ALLY, "noRetaliation"), unit("d", ParticipantSide.ENEMY, "unlimitedRetaliation", true))).toBeNull();
  });
});
