// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    units: [] as unknown[],
    races: [] as unknown[],
}));

vi.mock('@/lib/hooks/units/useUnits', () => ({
    useUnits: () => ({ data: state.units, isLoading: false }),
    useDeleteAllUnits: () => ({ mutateAsync: vi.fn() }),
    useDeleteUnit: () => ({ mutate: vi.fn() }),
    useUpdateUnit: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/lib/hooks/units/useGroupLabel', () => ({
    useGroupLabel: () => (k: string) => k,
}));
vi.mock('@/lib/hooks/campaigns', () => ({
    useCampaignRules: () => ({ data: undefined }),
}));
vi.mock('@/lib/hooks/races', () => ({
    useRaces: () => ({ data: state.races }),
}));
vi.mock('@/lib/hooks/common', () => ({
    SEARCH_DEBOUNCE_MS: 0,
    useDebouncedValue: (v: string) => v,
}));

import { useUnitsList } from '@/lib/hooks/units/useUnitsList';
import type { Unit } from '@/types/units';

const unit = (id: string, name: string) =>
    ({ id, name, raceId: null }) as unknown as Unit;

describe('useUnitsList open groups', () => {
    it('opens matching groups on search, collapses when cleared, manual toggle survives rerender', () => {
        state.units = [unit('1', 'Goblin'), unit('2', 'Orc')];

        const { result, rerender } = renderHook(() =>
            useUnitsList('c', state.units as Unit[])
        );

        expect(result.current.view.open).toEqual([]);

        act(() => result.current.filter.search('gob'));

        expect(result.current.view.open.length).toBeGreaterThan(0);

        act(() => result.current.view.setOpen(['manual']));
        rerender();

        expect(result.current.view.open).toEqual(['manual']);

        act(() => result.current.filter.search(''));

        expect(result.current.view.open).toEqual([]);
    });
});
