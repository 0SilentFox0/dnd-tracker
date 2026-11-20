import { wfrpState } from '../state';

import type { BattleParticipant } from '@/types/battle';

/** SL added to the chosen defensive skill until the fighter's next turn (p162) */
export const DEFENSIVE_SL = 2;

export const DEFENSIVE_SKILLS = ['parry', 'dodge', 'magick'] as const;

export type DefensiveSkill = (typeof DEFENSIVE_SKILLS)[number];

export const defensiveSkillOf = (
    p: BattleParticipant | undefined
): DefensiveSkill | undefined =>
    p
        ? (DEFENSIVE_SKILLS as readonly string[]).includes(
              wfrpState(p).defensive?.skill ?? ''
          )
            ? (wfrpState(p).defensive?.skill as DefensiveSkill)
            : undefined
        : undefined;

/** Defensive stance bonus per defence kind; Language (Magick) counts for Dispel only */
export const defensiveSl = (
    p: BattleParticipant | undefined
): { parry: number; dodge: number } => {
    const skill = defensiveSkillOf(p);

    return {
        parry: skill === 'parry' ? DEFENSIVE_SL : 0,
        dodge: skill === 'dodge' ? DEFENSIVE_SL : 0,
    };
};
