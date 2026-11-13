import { deathSavesOf } from './state';

import { isDying } from '@/lib/utils/abilities/engine/core/participants';
import type { BattleParticipant } from '@/types/battle';

export const d20HoldsOn = (p: BattleParticipant): boolean =>
    isDying(p) && !deathSavesOf(p)?.stable;
