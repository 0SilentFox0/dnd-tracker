'use client';

import { useEffect, useState } from 'react';

import { usePlayerAudio } from './usePlayerAudio';

import { audioPosition } from '@/lib/utils/audio/position';

const TICK_MS = 500;

/** Поточна позиція треку в секундах; null — тривалість невідома (YouTube без durationSec) або нічого не грає. */
export function useAudioPosition(): {
    positionSec: number;
    durationSec: number;
} | null {
    const { state, clockOffsetMs } = usePlayerAudio();

    const [now, setNow] = useState(() => Date.now());

    const durationSec = state?.track?.durationSec ?? null;

    const playing = !!state?.playing;

    useEffect(() => {
        if (!playing) return;

        const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);

        return () => window.clearInterval(timer);
    }, [playing]);

    if (!state?.trackId || !durationSec || durationSec <= 0) return null;

    return {
        positionSec: audioPosition(state, { now, clockOffsetMs, durationSec }),
        durationSec,
    };
}
