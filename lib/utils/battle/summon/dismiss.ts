import { CombatStatus } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

const expired = (p: BattleParticipant, round: number, ps: BattleParticipant[], rules: Ruleset) => {
  const object = p.battleData.object;

  return !!object && isActive(p) && ((object.expiresRound !== undefined && round > object.expiresRound) || !ruleSystemOf(rules).magic.sustain.anchorLive(ps, object.concentrationOf));
};

/** Предмет заклинання зникає (не гине) із закінченням тривалості чи концентрації; той самий масив — нічого не змінилось. */
export function dismissExpiredSummons(ps: BattleParticipant[], round: number, rules: Ruleset): { participants: BattleParticipant[]; messages: LogLine[] } {
  if (!ps.some((p) => expired(p, round, ps, rules))) return { participants: ps, messages: [] };

  const messages: LogLine[] = [];

  const participants = ps.map((p) => {
    if (!expired(p, round, ps, rules)) return p;

    const { position: _position, ...battleData } = p.battleData;

    messages.push(textRef("battleLog.summon.vanishes", { name: p.basicInfo.name }));

    return { ...p, combatStats: { ...p.combatStats, status: CombatStatus.DEAD }, battleData: { ...battleData, dismissed: true } };
  });

  return { participants, messages };
}
