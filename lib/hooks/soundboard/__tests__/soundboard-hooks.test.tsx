// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { soundKeys } from '../keys';
import { useSoundMutations } from '../useSoundMutations';
import { useSoundLibrary, useSounds } from '../useSounds';

import { getSounds } from '@/lib/api/soundboard';
import { MAX_SOUND_BYTES } from '@/lib/constants/soundboard';

vi.mock('@/lib/api/client', async (orig) => ({
    ...(await orig<typeof import('@/lib/api/client')>()),
    campaignPost: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/api/soundboard', async (orig) => ({
    ...(await orig<typeof import('@/lib/api/soundboard')>()),
    getSounds: vi.fn(),
}));

const LIST = {
    sounds: [
        {
            id: 's1',
            name: 'Mine',
            url: 'u',
            volume: 1,
            color: null,
            icon: null,
            sortOrder: 0,
            durationMs: 500,
        },
    ],
    hiddenBuiltin: ['builtin:bell'],
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
    vi.mocked(getSounds).mockResolvedValue(LIST);
});

describe('soundKeys', () => {
    it('list key', () => {
        expect(soundKeys.list('c')).toEqual(['sounds', 'c']);
    });
});

describe('useSounds', () => {
    it('fetches under the list key', async () => {
        const { client, wrapper } = setup();

        const { result } = renderHook(() => useSounds('c'), { wrapper });

        await waitFor(() => expect(result.current.data).toEqual(LIST));
        expect(client.getQueryData(soundKeys.list('c'))).toEqual(LIST);
    });

    it('does not fetch when disabled', () => {
        const { wrapper } = setup();

        renderHook(() => useSounds('c', { enabled: false }), { wrapper });

        expect(getSounds).not.toHaveBeenCalled();
    });
});

describe('useSoundLibrary', () => {
    it('merges builtin and custom and hides hidden builtin', async () => {
        const { wrapper } = setup();

        const { result } = renderHook(() => useSoundLibrary('c'), { wrapper });

        await waitFor(() => expect(result.current.custom).toHaveLength(1));

        const ids = result.current.all.map((s) => s.id);

        expect(ids).toContain('s1');
        expect(ids).toContain('builtin:door-open');
        expect(ids).not.toContain('builtin:bell');
        expect(result.current.hiddenBuiltin).toEqual(['builtin:bell']);
    });
});

describe('useSoundMutations', () => {
    it('upload rejects an oversized file before any request', async () => {
        const { campaignPost } = await import('@/lib/api/client');

        const { wrapper } = setup();

        const { result } = renderHook(() => useSoundMutations('c'), {
            wrapper,
        });

        const file = new File([new Uint8Array(MAX_SOUND_BYTES + 1)], 'a.mp3', {
            type: 'audio/mpeg',
        });

        await act(async () => {
            await expect(
                result.current.upload.mutateAsync({
                    file,
                    name: 'a',
                    durationMs: 100,
                })
            ).rejects.toThrow();
        });

        expect(campaignPost).not.toHaveBeenCalled();
    });
});
