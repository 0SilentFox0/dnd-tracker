import { originalSide } from "./original-side";

import { CombatStatus, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { xpShare } from "@/lib/constants/experience";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export interface BattleXpAward {
  total: number;
  share: number;
  characterIds: string[];
}

export const autoXpEnabled = (rules?: Ruleset): boolean => !!rules && rules.encounters.autoXp && rules.outOfCombat.xp;

const defeated = (p: BattleParticipant) => p.combatStats.status === CombatStatus.DEAD || p.combatStats.status === CombatStatus.UNCONSCIOUS;

export function battleXpAward(participants: BattleParticipant[]): BattleXpAward | null {
  const real = participants.filter((p) => !p.basicInfo.isExtraTurnSlot);

  const total = real
    .filter((p) => originalSide(p) === ParticipantSide.ENEMY && !p.battleData.summonedBy && defeated(p))
    .reduce((sum, p) => sum + (p.basicInfo.xp ?? 0), 0);

  const characterIds = [...new Set(real.filter((p) => p.basicInfo.sourceType === ParticipantSourceType.CHARACTER && originalSide(p) === ParticipantSide.ALLY).map((p) => p.basicInfo.sourceId))];

  if (total <= 0 || characterIds.length === 0) return null;

  const share = xpShare(total, characterIds.length, true);

  return share > 0 ? { total, share, characterIds } : null;
}
