// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePaletteState } from '../usePaletteState';

import { themeApi } from '@/lib/api/theme';
import type { PaletteSettings } from '@/types/theme';

const auth = vi.hoisted(() => ({
    userId: 'a' as string | null,
    changed: null as
        | null
        | ((event: string, session: { user: { id: string } } | null) => void),
}));

vi.mock('@/lib/api/theme', () => ({
    themeApi: { get: vi.fn(), set: vi.fn() },
}));
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: {
            getSession: async () => ({
                data: {
                    session: auth.userId ? { user: { id: auth.userId } } : null,
                },
            }),
            onAuthStateChange: (cb: typeof auth.changed) => {
                auth.changed = cb;

                return { data: { subscription: { unsubscribe: vi.fn() } } };
            },
        },
    }),
}));

function deferred<T>() {
    let resolve!: (value: T) => void;

    const promise = new Promise<T>((r) => {
        resolve = r;
    });

    return { promise, resolve };
}

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    auth.userId = 'a';
    vi.mocked(themeApi.get).mockResolvedValue({
        userId: 'a',
        palette: 'midnight',
    });
    vi.mocked(themeApi.set).mockImplementation(async (palette) => ({
        userId: 'a',
        palette,
    }));
});
afterEach(cleanup);

describe('usePaletteState', () => {
    it('restores the profile, saves changes and updates document colors immediately', async () => {
        const { result } = renderHook(() => usePaletteState('/campaigns'));

        await waitFor(() => expect(result.current.palette).toBe('midnight'));

        const save = deferred<PaletteSettings>();

        vi.mocked(themeApi.set).mockReturnValue(save.promise);

        let pending!: Promise<void>;

        act(() => {
            pending = result.current.setPalette('frost');
        });
        expect(document.documentElement.dataset.palette).toBe('frost');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(result.current.saving).toBe(true);
        await act(async () => {
            save.resolve({ userId: 'a', palette: 'frost' });
            await pending;
        });
        expect(themeApi.set).toHaveBeenCalledWith('frost');
        expect(localStorage.getItem('dnd-palette:a')).toBe('frost');
    });

    it('a late profile GET cannot overwrite a newer selection', async () => {
        const read = deferred<PaletteSettings>();

        vi.mocked(themeApi.get).mockReturnValue(read.promise);

        const { result } = renderHook(() => usePaletteState('/campaigns'));

        await waitFor(() => expect(result.current.ready).toBe(true));
        await act(() => result.current.setPalette('forest'));
        await act(async () => {
            read.resolve({ userId: 'a', palette: 'midnight' });
        });
        expect(result.current.palette).toBe('forest');
    });

    it('restores the old selection and reports failed writes', async () => {
        const { result } = renderHook(() => usePaletteState('/campaigns'));

        await waitFor(() => expect(result.current.palette).toBe('midnight'));
        vi.mocked(themeApi.set).mockRejectedValue(new Error('offline'));
        await act(() => result.current.setPalette('parchment'));
        expect(result.current.palette).toBe('midnight');
        expect(result.current.error).toBe('save');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('isolates cached preferences and discards old account responses', async () => {
        localStorage.setItem('dnd-palette:a', 'forest');
        localStorage.setItem('dnd-palette:b', 'amethyst');

        const readA = deferred<PaletteSettings>();

        const readB = deferred<PaletteSettings>();

        vi.mocked(themeApi.get)
            .mockReturnValueOnce(readA.promise)
            .mockReturnValueOnce(readB.promise);

        const { result } = renderHook(() => usePaletteState('/campaigns'));

        await waitFor(() => expect(result.current.palette).toBe('forest'));
        act(() => auth.changed?.('SIGNED_IN', { user: { id: 'b' } }));
        expect(result.current.palette).toBe('amethyst');
        await act(async () => {
            readA.resolve({ userId: 'a', palette: 'frost' });
        });
        expect(result.current.palette).toBe('amethyst');
        await act(async () => {
            readB.resolve({ userId: 'b', palette: 'parchment' });
        });
        expect(result.current.palette).toBe('parchment');
        act(() => auth.changed?.('SIGNED_OUT', null));
        expect(result.current.palette).toBe('tavern');
        expect(result.current.ready).toBe(false);
        expect(localStorage.getItem('dnd-palette-active')).toBeNull();
    });

    it('keeps landing and print surfaces on their default appearance', async () => {
        const { rerender } = renderHook(({ path }) => usePaletteState(path), {
            initialProps: { path: '/campaigns' },
        });

        await waitFor(() =>
            expect(document.documentElement.dataset.palette).toBe('midnight')
        );
        rerender({ path: '/' });
        expect(document.documentElement.hasAttribute('data-palette')).toBe(
            false
        );
    });
});
