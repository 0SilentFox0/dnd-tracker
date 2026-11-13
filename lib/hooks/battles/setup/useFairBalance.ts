'use client';

import { useMemo } from 'react';

import type { HitModel } from '@/lib/utils/battle/balance';
import {
    type SetupBalanceParticipant,
    type SetupBalanceStats,
    setupFairScaling,
} from '@/lib/utils/battle/balance/setup';

export function useFairBalance(
    participants: SetupBalanceParticipant[],
    stats: SetupBalanceStats | null | undefined,
    raceId: string | null | undefined,
    model: HitModel
) {
    return useMemo(
        () =>
            stats ? setupFairScaling(participants, stats, raceId, model) : null,
        [participants, stats, raceId, model]
    );
}
