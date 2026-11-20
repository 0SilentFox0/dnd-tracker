import { participantStats } from '../combat/participant';
import type { EditionProfile } from '../edition/profiles';
import { ARMOUR_SL_PER_AP } from './constants';

import type { BattleParticipant } from '@/types/battle';

export function armourSl(
    p: BattleParticipant,
    edition?: Pick<EditionProfile, 'magicModel'>
): number {
    const { ap, castAp, castApAll, flexible } = participantStats(p) ?? {};

    if (!ap || flexible) return 0;

    const best =
        edition?.magicModel === 'canon5e'
            ? Math.max(...Object.values(ap))
            : Math.max(ap.head, ap.body);

    const canon = edition?.magicModel === 'canon5e';

    return ((canon ? castApAll : castAp) ?? best) * ARMOUR_SL_PER_AP;
}
