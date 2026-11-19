// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { soundKeys } from '../keys';
import { useActivePreset } from '../useActivePreset';
import { useLibraryMutations } from '../useLibraryMutations';
import { useSoundLibrary } from '../useSoundLibrary';

import { getSoundLibrary } from '@/lib/api/sound-library';
import { MAX_SOUND_BYTES } from '@/lib/constants/soundboard';
import type { SoundPreset } from '@/types/soundboard';

vi.mock('@/lib/api/client', async (orig) => ({
    ...(await orig<typeof import('@/lib/api/client')>()),
    request: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/api/sound-library', async (orig) => ({
    ...(await orig<typeof import('@/lib/api/sound-library')>()),
    getSoundLibrary: vi.fn(),
}));

const LIBRARY = {
    sounds: [
        {
            id: 's1',
            name: 'Mine',
            icon: 'bell',
            color: null,
            volume: 1,
            url: 'u',
            durationMs: 500,
            sourceUrl: null,
        },
    ],
    presets: [{ id: 'p1', name: 'P', slots: [], sortOrder: 0 }],
};

function setup() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    return { client, wrapper };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSoundLibrary).mockResolvedValue(LIBRARY);
});

describe('soundKeys', () => {
    it('library key', () => {
        expect(soundKeys.library()).toEqual(['sound-library']);
    });
});

describe('useSoundLibrary', () => {
    it('merges builtin and library sounds, exposes presets', async () => {
        const { client, wrapper } = setup();

        const { result } = renderHook(() => useSoundLibrary(), { wrapper });

        await waitFor(() => expect(result.current.presets).toHaveLength(1));

        expect(result.current.byId.get('s1')?.source).toBe('library');
        expect(result.current.byId.get('builtin:bell')?.source).toBe('builtin');
        expect(client.getQueryData(soundKeys.library())).toEqual(LIBRARY);
    });

    it('keeps builtin sounds before the library loads', () => {
        const { wrapper } = setup();

        const { result } = renderHook(() => useSoundLibrary(), { wrapper });

        expect(result.current.byId.has('builtin:bell')).toBe(true);
    });

    it('does not fetch when disabled', () => {
        const { wrapper } = setup();

        renderHook(() => useSoundLibrary({ enabled: false }), { wrapper });

        expect(getSoundLibrary).not.toHaveBeenCalled();
    });
});

describe('useLibraryMutations', () => {
    it('upload rejects an oversized file before any request', async () => {
        const { request } = await import('@/lib/api/client');

        const { wrapper } = setup();

        const { result } = renderHook(() => useLibraryMutations(), { wrapper });

        const file = new File([new Uint8Array(MAX_SOUND_BYTES + 1)], 'a.mp3', {
            type: 'audio/mpeg',
        });

        await act(async () => {
            await expect(
                result.current.upload.mutateAsync({ file, durationMs: 100 })
            ).rejects.toThrow();
        });

        expect(request).not.toHaveBeenCalled();
    });
});

describe('useActivePreset', () => {
    const presets: SoundPreset[] = [
        { id: 'a', name: 'A', slots: [], sortOrder: 0 },
        { id: 'b', name: 'B', slots: [], sortOrder: 1 },
    ];

    beforeEach(() => window.localStorage.clear());

    it('falls back to the first preset', () => {
        const { result } = renderHook(() => useActivePreset('c', presets));

        expect(result.current.preset?.id).toBe('a');
    });

    it('restores the saved id and persists changes', () => {
        window.localStorage.setItem('soundboard.preset.c', 'b');

        const { result } = renderHook(() => useActivePreset('c', presets));

        expect(result.current.preset?.id).toBe('b');

        act(() => result.current.setPresetId('a'));

        expect(result.current.preset?.id).toBe('a');
        expect(window.localStorage.getItem('soundboard.preset.c')).toBe('a');
    });

    it('falls back to the first when the saved preset was deleted', () => {
        window.localStorage.setItem('soundboard.preset.c', 'gone');

        const { result } = renderHook(() => useActivePreset('c', presets));

        expect(result.current.preset?.id).toBe('a');
    });

    it('tolerates a throwing localStorage', () => {
        const spy = vi
            .spyOn(Storage.prototype, 'getItem')
            .mockImplementation(() => {
                throw new Error('denied');
            });

        const set = vi
            .spyOn(Storage.prototype, 'setItem')
            .mockImplementation(() => {
                throw new Error('denied');
            });

        const { result } = renderHook(() => useActivePreset('c', presets));

        expect(result.current.preset?.id).toBe('a');

        act(() => result.current.setPresetId('b'));

        expect(result.current.preset?.id).toBe('b');

        spy.mockRestore();
        set.mockRestore();
    });

    it('is null without presets', () => {
        const { result } = renderHook(() => useActivePreset('c', []));

        expect(result.current.preset).toBeNull();
    });
});
