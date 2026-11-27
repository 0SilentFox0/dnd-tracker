// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTrackDuration } from '../useTrackDuration';

import type { CampaignTrack } from '@/types/audio';

const audios: FakeAudio[] = [];

class FakeAudio {
    preload = '';
    src = '';
    duration = 187.4;
    listeners: Record<string, () => void> = {};
    load = vi.fn();
    removeAttribute = vi.fn();
    removeEventListener = vi.fn();
    addEventListener = (name: string, fn: () => void) => {
        this.listeners[name] = fn;
    };

    constructor() {
        audios.push(this);
    }
}

const track = (over: Partial<CampaignTrack> = {}): CampaignTrack => ({
    id: 't1',
    title: 'Battle',
    kind: 'file',
    url: 'https://s/c1/battle.mp3',
    youtubeId: null,
    durationSec: null,
    sortOrder: 0,
    createdAt: '',
    ...over,
});

afterEach(() => {
    audios.length = 0;
    vi.unstubAllGlobals();
});

describe('useTrackDuration', () => {
    it('reads metadata lazily once enabled', () => {
        vi.stubGlobal('Audio', FakeAudio);

        const { result, rerender } = renderHook(
            ({ on }) => useTrackDuration(track(), on),
            { initialProps: { on: false } }
        );

        expect(audios).toHaveLength(0);
        rerender({ on: true });
        expect(audios[0].preload).toBe('metadata');
        act(() => audios[0].listeners.loadedmetadata());
        expect(result.current).toBe(187);
    });

    it('uses the stored duration without touching audio', () => {
        vi.stubGlobal('Audio', FakeAudio);

        const { result } = renderHook(() =>
            useTrackDuration(track({ durationSec: 90 }), true)
        );

        expect(audios).toHaveLength(0);
        expect(result.current).toBe(90);
    });

    it('skips youtube tracks', () => {
        vi.stubGlobal('Audio', FakeAudio);

        const { result } = renderHook(() =>
            useTrackDuration(
                track({ kind: 'youtube', url: null, youtubeId: 'abc' }),
                true
            )
        );

        expect(audios).toHaveLength(0);
        expect(result.current).toBeNull();
    });
});
