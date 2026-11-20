import { conditionLevel } from '../conditions/levels';
import { wfrpState } from '../state';

import { inPlay } from '@/lib/utils/abilities/engine/core/participants';
import type { BattleParticipant } from '@/types/battle';

export const FRENZY_DAMAGE_BONUS = 1;

/** In a Frenzy until Stunned or down (p184); immune to other psychology meanwhile */
export const isFrenzied = (p: BattleParticipant): boolean =>
    wfrpState(p).frenzy === true &&
    inPlay(p) &&
    conditionLevel(p, 'stunned') === 0;
