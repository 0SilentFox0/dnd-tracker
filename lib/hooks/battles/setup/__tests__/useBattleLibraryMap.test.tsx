// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    enabled: true,
    maps: [{ id: 'm1' }, { id: 'm2' }] as {
        id: string;
        cols?: number;
        rows?: number;
    }[],
    confirm: vi.fn(async () => true),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('@/lib/hooks/campaigns', () => ({
    useMapLibraryEnabled: () => h.enabled,
}));
vi.mock('@/lib/hooks/battle-maps', () => ({
    useBattleMaps: () => ({ data: h.maps }),
}));
vi.mock('@/lib/hooks/common', () => ({ useConfirm: () => h.confirm }));

import { useBattleLibraryMap } from '../useBattleLibraryMap';

const linked = { mapId: 'm1', version: 2 };

const run = (opts: Parameters<typeof useBattleLibraryMap>[1]) =>
    renderHook(() => useBattleLibraryMap('c', opts));

describe('useBattleLibraryMap in edit mode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.enabled = true;
        h.maps = [{ id: 'm1' }, { id: 'm2' }];
    });

    it('prepared: picker visible with the flag on or when linked', () => {
        expect(
            run({ isEdit: true, status: 'prepared' }).result.current.visible
        ).toBe(true);

        h.enabled = false;

        expect(
            run({ isEdit: true, status: 'prepared' }).result.current.visible
        ).toBe(false);
        expect(
            run({ isEdit: true, status: 'prepared', linked }).result.current
                .visible
        ).toBe(true);
    });

    it('active: visible only when linked, and locked', () => {
        expect(
            run({ isEdit: true, status: 'active' }).result.current.visible
        ).toBe(false);

        const { result } = run({ isEdit: true, status: 'active', linked });

        expect(result.current.visible).toBe(true);
        expect(result.current.isLocked).toBe(true);
    });

    it('confirms before switching a battle that has a map', async () => {
        const { result } = run({
            isEdit: true,
            status: 'prepared',
            linked,
            hadMap: true,
        });

        await act(() => result.current.select('m2'));

        expect(h.confirm).toHaveBeenCalledOnce();
        expect(result.current.selectedId).toBe('m2');
        expect(result.current.isChanged).toBe(true);
        expect(result.current.isLinked).toBe(false);
    });

    it('declined confirm keeps the selection', async () => {
        h.confirm.mockResolvedValueOnce(false);

        const { result } = run({
            isEdit: true,
            status: 'prepared',
            linked,
            hadMap: true,
        });

        await act(() => result.current.select(null));

        expect(result.current.selectedId).toBe('m1');
        expect(result.current.isLinked).toBe(true);
    });

    it('a linked map above the inline limit cannot be unlinked', async () => {
        h.maps = [{ id: 'm1', cols: 120, rows: 90 }, { id: 'm2' }];

        const { result } = run({
            isEdit: true,
            status: 'prepared',
            linked,
            hadMap: true,
        });

        expect(result.current.canUnlink).toBe(false);

        await act(() => result.current.select(null));

        expect(result.current.selectedId).toBe('m1');
        expect(h.confirm).not.toHaveBeenCalled();
    });

    it('create mode never confirms', async () => {
        const { result } = run({});

        await act(() => result.current.select('m2'));

        expect(h.confirm).not.toHaveBeenCalled();
        expect(result.current.selectedId).toBe('m2');
    });
});

describe('useBattleLibraryMap maxSide', () => {
    it('follows the library flag', () => {
        h.enabled = true;
        expect(run({}).result.current.maxSide).toBe(200);

        h.enabled = false;
        expect(run({}).result.current.maxSide).toBe(60);
    });
});
