import { CombatStatus } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { isZoneConcentrationLive } from "@/lib/utils/battle/concentration";
import type { BattleParticipant } from "@/types/battle";

const expired = (p: BattleParticipant, round: number, ps: BattleParticipant[]) => {
  const object = p.battleData.object;

  return !!object && isActive(p) && ((object.expiresRound !== undefined && round > object.expiresRound) || !isZoneConcentrationLive(ps, object.concentrationOf));
};

/** Предмет заклинання зникає (не гине) із закінченням тривалості чи концентрації; той самий масив — нічого не змінилось. */
export function dismissExpiredSummons(ps: BattleParticipant[], round: number): { participants: BattleParticipant[]; messages: string[] } {
  if (!ps.some((p) => expired(p, round, ps))) return { participants: ps, messages: [] };

  const messages: string[] = [];

  const participants = ps.map((p) => {
    if (!expired(p, round, ps)) return p;

    const { position: _position, ...battleData } = p.battleData;

    messages.push(`🌿 ${p.basicInfo.name} зникає`);

    return { ...p, combatStats: { ...p.combatStats, status: CombatStatus.DEAD }, battleData: { ...battleData, dismissed: true } };
  });

  return { participants, messages };
}
