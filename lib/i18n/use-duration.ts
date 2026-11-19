'use client';

import { useCallback } from 'react';

import { useTranslator } from './use-translator';

import {
    DURATION_SEGMENT_KEY,
    durationArgs,
} from '@/lib/utils/duration/format';

export function useFormatDuration() {
    const t = useTranslator('abilityRegistry');

    return useCallback(
        (rounds: number) => t(DURATION_SEGMENT_KEY, durationArgs(rounds)),
        [t]
    );
}
