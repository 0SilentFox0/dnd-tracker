// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    __resetNonces,
    handleSoundPlayEvent,
    markLocalPlay,
} from '../handle-play-event';
import { soundKeys } from '../keys';
import { __resetForTests, armUnlock, playBuffer } from '../player';
import { useSoundboardPads } from '../useSoundboardPads';

import { getSounds, playSound } from '@/lib/api/soundboard';
import { PAD_GUARD_MS } from '@/lib/constants/soundboard';
import type { Sound } from '@/types/soundboard';

vi.mock('@/lib/api/soundboard', async (orig) => ({
    ...(await orig<typeof import('@/lib/api/soundboard')>()),
    playSound: vi.fn(() => Promise.resolve({ ok: true })),
    getSounds: vi.fn(),
}));

const prefs = vi.hoisted(() => ({ muted: false }));

vi.mock('@/lib/hooks/audio', () => ({
    readAudioPrefs: () => ({ volume: 1, muted: prefs.muted }),
}));
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useNotify: () => vi.fn(),
}));

const state = vi.hoisted(() => ({
    ctxState: 'running' as string,
    sources: [] as Array<{
        start: ReturnType<typeof vi.fn>;
        stop: ReturnType<typeof vi.fn>;
    }>,
}));

class FakeAudioContext {
    destination = {};

    get state() {
        return state.ctxState;
    }

    resume = vi.fn(() => {
        state.ctxState = 'running';

        return Promise.resolve();
    });

    decodeAudioData = vi.fn(() => Promise.resolve({}));

    createGain = () => ({ gain: { value: 1 }, connect: vi.fn() });

    createBufferSource = () => {
        const s = {
            start: vi.fn(),
            stop: vi.fn(),
            connect: vi.fn(),
            buffer: null,
            onended: null,
        };

        state.sources.push(s);

        return s;
    };
}

const sound = (id: string): Sound => ({
    id,
    source: 'custom',
    name: id,
    url: `/${id}.mp3`,
    volume: 1,
    color: null,
    icon: null,
    sortOrder: 0,
    durationMs: null,
});

const flush = () => new Promise((r) => setTimeout(r, 0));

const client = () => {
    const qc = new QueryClient();

    qc.setQueryData(soundKeys.list('c1'), {
        sounds: [{ ...sound('s1'), source: undefined }],
        hiddenBuiltin: [],
    });

    return qc;
};

beforeEach(() => {
    state.ctxState = 'running';
    state.sources = [];
    vi.stubGlobal('AudioContext', FakeAudioContext);
    window.AudioContext = FakeAudioContext as never;
    vi.stubGlobal(
        'fetch',
        vi.fn(() =>
            Promise.resolve({
                ok: true,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
            })
        )
    );
    prefs.muted = false;
    __resetForTests();
    __resetNonces();
    vi.mocked(playSound).mockClear();
});

describe('handleSoundPlayEvent', () => {
    it('plays a duplicate nonce once', async () => {
        const qc = client();

        handleSoundPlayEvent(qc, 'c1', { soundId: 's1', nonce: 'n1' });
        handleSoundPlayEvent(qc, 'c1', { soundId: 's1', nonce: 'n1' });
        await flush();

        expect(state.sources).toHaveLength(1);
        expect(state.sources[0].start).toHaveBeenCalled();
    });

    it('ignores an unknown sound id and malformed data', async () => {
        const qc = client();

        expect(() => {
            handleSoundPlayEvent(qc, 'c1', { soundId: 'nope', nonce: 'n2' });
            handleSoundPlayEvent(qc, 'c1', null);
            handleSoundPlayEvent(qc, 'c1', { soundId: 1, nonce: 'n3' });
        }).not.toThrow();
        await flush();

        expect(state.sources).toHaveLength(0);
    });

    it('refetches the list once when the sound is missing from the cache', async () => {
        vi.mocked(getSounds).mockResolvedValue({
            sounds: [{ ...sound('s9'), source: undefined }],
            hiddenBuiltin: [],
        } as never);
        vi.mocked(getSounds).mockClear();

        handleSoundPlayEvent(client(), 'c1', { soundId: 's9', nonce: 'n9' });
        await flush();

        expect(getSounds).toHaveBeenCalledTimes(1);
        expect(state.sources).toHaveLength(1);
    });

    it('markLocalPlay suppresses the echo', async () => {
        markLocalPlay('n4');
        handleSoundPlayEvent(client(), 'c1', { soundId: 's1', nonce: 'n4' });
        await flush();

        expect(state.sources).toHaveLength(0);
    });

    it('does not play when muted', async () => {
        prefs.muted = true;
        handleSoundPlayEvent(client(), 'c1', { soundId: 's1', nonce: 'n5' });
        await flush();

        expect(state.sources).toHaveLength(0);
    });
});

describe('player', () => {
    it('resumes a suspended context before playing', async () => {
        state.ctxState = 'suspended';

        await playBuffer(sound('s1'), 1);

        expect(state.sources).toHaveLength(1);
    });

    it('stays silent without throwing when resume leaves it suspended', async () => {
        state.ctxState = 'suspended';
        window.AudioContext = class extends FakeAudioContext {
            resume = vi.fn(() => Promise.resolve());
        } as never;

        await expect(playBuffer(sound('s1'), 1)).resolves.toBeUndefined();

        expect(state.sources).toHaveLength(0);
    });

    it('stops the first voice when the 9th starts', async () => {
        for (let i = 0; i < 9; i++) await playBuffer(sound('s1'), 1);

        expect(state.sources[0].stop).toHaveBeenCalledTimes(1);
        expect(state.sources[1].stop).not.toHaveBeenCalled();
    });

    it('armUnlock resumes the context once on first gesture', async () => {
        state.ctxState = 'suspended';
        armUnlock();
        armUnlock();
        document.dispatchEvent(new Event('pointerdown'));

        await playBuffer(sound('s1'), 1);

        expect(state.sources).toHaveLength(1);
    });
});

describe('useSoundboardPads', () => {
    it('posts once for two plays within the guard window', () => {
        vi.useFakeTimers();

        const qc = client();

        const { result } = renderHook(() => useSoundboardPads('c1'), {
            wrapper: ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={qc}>
                    {children}
                </QueryClientProvider>
            ),
        });

        const s = result.current.sounds.find((x) => x.id === 's1') as Sound;

        result.current.play(s);
        vi.advanceTimersByTime(PAD_GUARD_MS - 50);
        result.current.play(s);

        expect(playSound).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(100);
        result.current.play(s);

        expect(playSound).toHaveBeenCalledTimes(2);

        vi.useRealTimers();
    });
});
