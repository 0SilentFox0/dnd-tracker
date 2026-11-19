// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    __resetNonces,
    handleSoundPlayEvent,
    markLocalPlay,
} from '../handle-play-event';
import { __resetForTests, armUnlock, playBuffer } from '../player';
import { useSoundboardPads } from '../useSoundboardPads';

import { getSoundLibrary } from '@/lib/api/sound-library';
import { playSound } from '@/lib/api/soundboard';
import { PAD_GUARD_MS } from '@/lib/constants/soundboard';
import type { LibrarySound } from '@/types/soundboard';

vi.mock('@/lib/api/soundboard', () => ({
    playSound: vi.fn(() => Promise.resolve({ ok: true })),
}));
vi.mock('@/lib/api/sound-library', () => ({ getSoundLibrary: vi.fn() }));

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

const sound = (id: string): LibrarySound => ({
    id,
    source: 'library',
    name: id,
    icon: 'bell',
    color: null,
    volume: 1,
    url: `/${id}.mp3`,
    durationMs: null,
});

const flush = () => new Promise((r) => setTimeout(r, 0));

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
    vi.mocked(getSoundLibrary).mockClear();
});

describe('handleSoundPlayEvent', () => {
    it('plays a custom sound from event.url without any library fetch', async () => {
        handleSoundPlayEvent('c1', { soundId: 's1', nonce: 'n1', url: '/s1.mp3' });
        await flush();

        expect(state.sources).toHaveLength(1);
        expect(state.sources[0].start).toHaveBeenCalled();
        expect(getSoundLibrary).not.toHaveBeenCalled();
    });

    it('plays a builtin by id without a url', async () => {
        handleSoundPlayEvent('c1', { soundId: 'builtin:bell', nonce: 'n2' });
        await flush();

        expect(state.sources).toHaveLength(1);
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/sfx/bell.mp3')
        );
    });

    it('plays a duplicate nonce once', async () => {
        const event = { soundId: 's1', nonce: 'n3', url: '/s1.mp3' };

        handleSoundPlayEvent('c1', event);
        handleSoundPlayEvent('c1', event);
        await flush();

        expect(state.sources).toHaveLength(1);
    });

    it('ignores an unknown id without url and malformed data', async () => {
        expect(() => {
            handleSoundPlayEvent('c1', { soundId: 'nope', nonce: 'n4' });
            handleSoundPlayEvent('c1', { soundId: 'builtin:nope', nonce: 'n5', url: '/x.mp3' });
            handleSoundPlayEvent('c1', null);
            handleSoundPlayEvent('c1', { soundId: 1, nonce: 'n6' });
        }).not.toThrow();
        await flush();

        expect(state.sources).toHaveLength(0);
    });

    it('markLocalPlay suppresses the echo', async () => {
        markLocalPlay('n7');
        handleSoundPlayEvent('c1', { soundId: 's1', nonce: 'n7', url: '/s1.mp3' });
        await flush();

        expect(state.sources).toHaveLength(0);
    });

    it('does not play when muted', async () => {
        prefs.muted = true;
        handleSoundPlayEvent('c1', { soundId: 's1', nonce: 'n8', url: '/s1.mp3' });
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

    it('armUnlock resumes the context on a gesture', async () => {
        state.ctxState = 'suspended';
        armUnlock();
        armUnlock();
        document.dispatchEvent(new Event('pointerup'));

        await playBuffer(sound('s1'), 1);

        expect(state.sources).toHaveLength(1);
    });

    it('armUnlock keeps listening until the context runs', async () => {
        state.ctxState = 'suspended';

        let calls = 0;

        window.AudioContext = class extends FakeAudioContext {
            resume = vi.fn(() => {
                if (++calls > 1) state.ctxState = 'running';

                return Promise.resolve();
            });
        } as never;

        armUnlock();
        document.dispatchEvent(new Event('click'));
        await flush();
        document.dispatchEvent(new Event('touchend'));
        await flush();

        expect(calls).toBe(2);

        document.dispatchEvent(new Event('keydown'));
        await flush();

        expect(calls).toBe(2);
    });

    it('drops a remote play that waited too long for resume', async () => {
        vi.useFakeTimers();
        state.ctxState = 'suspended';
        window.AudioContext = class extends FakeAudioContext {
            resume = vi.fn(async () => {
                vi.advanceTimersByTime(1500);
                state.ctxState = 'running';
            });
        } as never;

        await playBuffer(sound('s1'), 1, { remote: true });
        vi.useRealTimers();

        expect(state.sources).toHaveLength(0);
    });

    it('still plays a local press after a slow resume', async () => {
        vi.useFakeTimers();
        state.ctxState = 'suspended';
        window.AudioContext = class extends FakeAudioContext {
            resume = vi.fn(async () => {
                vi.advanceTimersByTime(1500);
                state.ctxState = 'running';
            });
        } as never;

        await playBuffer(sound('s1'), 1);
        vi.useRealTimers();

        expect(state.sources).toHaveLength(1);
    });
});

describe('useSoundboardPads', () => {
    const setup = () => {
        const qc = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });

        vi.mocked(getSoundLibrary).mockResolvedValue({
            sounds: [
                {
                    id: 's1',
                    name: 's1',
                    icon: 'bell',
                    color: null,
                    volume: 1,
                    url: '/s1.mp3',
                    durationMs: 100,
                    sourceUrl: null,
                },
            ],
            presets: [
                {
                    id: 'p1',
                    name: 'P',
                    sortOrder: 0,
                    slots: ['s1', 'gone', null, 'builtin:bell'],
                },
            ],
        });

        return renderHook(() => useSoundboardPads('c1'), {
            wrapper: ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={qc}>
                    {children}
                </QueryClientProvider>
            ),
        });
    };

    it('returns 9 pads with null for empty or missing slots', async () => {
        const { result } = setup();

        await waitFor(() => expect(result.current.pads[0]).not.toBeNull());

        expect(result.current.pads).toHaveLength(9);
        expect(result.current.pads[0]?.id).toBe('s1');
        expect(result.current.pads[1]).toBeNull();
        expect(result.current.pads[2]).toBeNull();
        expect(result.current.pads[3]?.id).toBe('builtin:bell');
    });

    it('play posts { soundId, nonce } once within the guard window and plays locally', async () => {
        const { result } = setup();

        await waitFor(() => expect(result.current.pads[0]).not.toBeNull());

        const s = result.current.pads[0] as LibrarySound;

        result.current.play(s);
        result.current.play(s);
        await flush();

        expect(playSound).toHaveBeenCalledTimes(1);
        expect(playSound).toHaveBeenCalledWith('c1', {
            soundId: 's1',
            nonce: expect.any(String),
        });
        expect(state.sources).toHaveLength(1);

        await new Promise((r) => setTimeout(r, PAD_GUARD_MS + 20));
        result.current.play(s);

        expect(playSound).toHaveBeenCalledTimes(2);
    });
});
