import { describe, expect, it } from "vitest";

import { extraRetaliations } from "@/data/library/unit-abilities";
import { AttackType, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveRetaliation } from "@/lib/utils/battle/attack/retaliation";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

function unit(id: string, side: ParticipantSide, count?: number): BattleParticipant {
  const p = makeParticipant({ id, side, hp: 300, maxHp: 300, abilities: count ? [resolved(extraRetaliations(count))] : undefined });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT }, battleData: { ...p.battleData, attacks: [sword] } };
}

function retaliations(defender: BattleParticipant, tries: number): boolean[] {
  let ps = [unit("a", ParticipantSide.ALLY), defender];

  return Array.from({ length: tries }, () => {
    const r = resolveRetaliation({ participants: ps, attackerId: "a", defenderId: "d", attack: sword, attackRoll: { isCriticalFail: false }, round: 1, battleId: "b1", rng: seq(0.85) });

    if (r) ps = r.participants;

    return r !== null;
  });
}

describe("лічильник відсічей", () => {
  it("Подвійна відсіч: дві відповіді за раунд, третьої немає", () => {
    expect(retaliations(unit("d", ParticipantSide.ENEMY, 1), 3)).toEqual([true, true, false]);
  });

  it("без вміння: одна відповідь", () => {
    expect(retaliations(unit("d", ParticipantSide.ENEMY), 2)).toEqual([true, false]);
  });

  it("лічильник тримається на учаснику", () => {
    const d = unit("d", ParticipantSide.ENEMY, 1);

    let ps = [unit("a", ParticipantSide.ALLY), d];

    const r = resolveRetaliation({ participants: ps, attackerId: "a", defenderId: "d", attack: sword, attackRoll: { isCriticalFail: false }, round: 1, battleId: "b1", rng: seq(0.85) });

    ps = r?.participants ?? ps;

    const after = ps.find((p) => p.basicInfo.id === "d");

    expect(after?.battleData.retaliationsUsed).toBe(1);
    expect(after?.actionFlags.hasUsedReaction).toBe(false);
  });
});
