'use client';

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react';

import type { AudioHost } from './host';
import { type AudioControl, useAudioControl } from './useAudioControl';
import { useAudioElementSync } from './useAudioElementSync';
import { type AudioPrefs, useAudioPrefs } from './useAudioPrefs';
import { useAudioState } from './useAudioState';

import { type MusicLibrary, useMusicLibrary } from '@/lib/hooks/music';
import type { BattleAudioState } from '@/types/audio';

export interface PlayerAudioDm {
    control: AudioControl;
    library: MusicLibrary;
    musicHref: string;
}

export interface PlayerAudioValue {
    state: BattleAudioState | null;
    clockOffsetMs: number;
    sound: { unlocked: boolean; unlock(): void; failed: boolean };
    prefs: AudioPrefs;
    dm: PlayerAudioDm | null;
}

export const AudioPlayerContext = createContext<PlayerAudioValue | null>(null);

export function usePlayerAudioValue(host: AudioHost): {
    value: PlayerAudioValue;
    audioRef: (el: HTMLAudioElement | null) => void;
} {
    const { campaignId, isDM, silent = false } = host;

    // browsers allow sound only after a gesture: one click per page open
    const [unlocked, setUnlocked] = useState(false);

    const { audio, clockOffsetMs } = useAudioState({ host, unlocked });

    const basePrefs = useAudioPrefs();

    const prefs = useMemo(
        () => (silent ? { ...basePrefs, muted: true } : basePrefs),
        [silent, basePrefs]
    );

    const control = useAudioControl(host);

    const library = useMusicLibrary(campaignId, undefined, isDM);

    const track = audio?.track ?? null;

    const relock = useCallback(() => setUnlocked(false), []);

    const media = useAudioElementSync({
        src: track?.kind === 'file' ? track.url : null,
        state: audio,
        clockOffsetMs: clockOffsetMs ?? 0,
        unlocked,
        volume: prefs.volume,
        muted: prefs.muted,
        onBlocked: relock,
    });

    const { prime, failed } = media;

    const unlock = useCallback(() => {
        prime();
        setUnlocked(true);
    }, [prime]);

    const dm = useMemo(
        () =>
            control
                ? {
                      control,
                      library,
                      musicHref: `/campaigns/${campaignId}/dm/music`,
                  }
                : null,
        [control, library, campaignId]
    );

    const value = useMemo(
        () => ({
            state: audio,
            clockOffsetMs: clockOffsetMs ?? 0,
            sound: { unlocked, unlock, failed },
            prefs,
            dm,
        }),
        [audio, clockOffsetMs, unlocked, unlock, failed, prefs, dm]
    );

    return { value, audioRef: media.ref };
}

export function usePlayerAudio(): PlayerAudioValue {
    const value = useContext(AudioPlayerContext);

    if (!value) throw new Error('usePlayerAudio: missing AudioPlayerContext');

    return value;
}
