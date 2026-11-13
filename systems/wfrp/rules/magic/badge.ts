import { wfrpState } from '../state';

import { textRef } from '@/lib/i18n/text-ref';
import type { ActiveEffect, BattleParticipant } from '@/types/battle';

const EPOCH = new Date(0);

export function channelBadge(p: BattleParticipant): ActiveEffect | null {
    const sl = wfrpState(p).channelledSl ?? 0;

    if (sl <= 0) return null;

    return {
        id: `channelled-${p.basicInfo.id}`,
        name: 'channelled',
        label: textRef('wfrpMagic.ui.badge.label', { sl }),
        description: textRef('wfrpMagic.ui.badge.hint', { sl }),
        type: 'buff',
        duration: 0,
        permanent: true,
        appliedAt: { round: 0, timestamp: EPOCH },
        effects: [],
    };
}
