import { editionOf } from '../edition';
import { wfrpState } from '../state';
import { participantChars } from './participant';

import type { BattleParticipant } from '@/types/battle';

/** Current Fate: the spent-down value, else the characteristic (an unspent pool is not stored) */
export const fateLeftOf = (p: BattleParticipant): number =>
    wfrpState(p).fate ?? participantChars(p).fate;

export const fateSpendsOn = (rules?: object | null): boolean =>
    editionOf(rules).fortunePools === 'split';
