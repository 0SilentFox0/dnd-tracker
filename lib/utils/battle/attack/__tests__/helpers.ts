import { AttackType, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveRetaliation } from "@/lib/utils/battle/attack/retaliation";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export const SWORD: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

export function swordUnit(id: string, side: ParticipantSide, abilities?: ResolvedAbility[]): BattleParticipant {
  const p = makeParticipant({ id, side, hp: 300, maxHp: 300, abilities });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT }, battleData: { ...p.battleData, attacks: [SWORD] } };
}

export function retaliate(ps: BattleParticipant[], map?: BattleMapConfig, rng: () => number = seq(0.85)) {
  return resolveRetaliation({ participants: ps, attackerId: "a", defenderId: "d", attack: SWORD, attackRoll: { isCriticalFail: false }, round: 1, battleId: "b1", rng, ...(map && { map }) });
}

export function retaliateTimes(ps: BattleParticipant[], tries: number): boolean[] {
  let order = ps;

  return Array.from({ length: tries }, () => {
    const r = retaliate(order);

    if (r) order = r.participants;

    return r !== null;
  });
}
