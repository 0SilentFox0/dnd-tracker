import { wfrpState } from '../state';
import { isFrenzied } from './frenzy';

import type { BattleParticipant } from '@/types/battle';

export const isAfraid = (p: BattleParticipant): boolean =>
    !isFrenzied(p) && Object.keys(wfrpState(p).fear ?? {}).length > 0;

export const isAfraidOf = (p: BattleParticipant, sourceId: string): boolean =>
    !isFrenzied(p) && wfrpState(p).fear?.[sourceId] !== undefined;
