// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBattleListSections } from '../useBattleListSections';

import { SEARCH_DEBOUNCE_MS } from '@/lib/hooks/common';

const battles = [
    { id: '1', name: 'Dragon', status: 'active' },
    { id: '2', name: 'Goblins', status: 'prepared' },
    { id: '3', name: 'Ghouls', status: 'prepared' },
    { id: '4', name: 'Goblin king', status: 'completed' },
];

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

const ids = (list: { id: string }[]) => list.map((b) => b.id);

describe('useBattleListSections', () => {
    it('splits battles by status and counts them', () => {
        const { result } = renderHook(() => useBattleListSections(battles));

        expect(ids(result.current.active)).toEqual(['1']);
        expect(ids(result.current.prepared)).toEqual(['2', '3']);
        expect(ids(result.current.completed)).toEqual(['4']);
        expect(result.current.filter.counts).toEqual({
            all: 4,
            prepared: 2,
            completed: 1,
        });
    });

    it('filter narrows prepared and completed', () => {
        const { result } = renderHook(() => useBattleListSections(battles));

        act(() => result.current.filter.set('completed'));

        expect(result.current.prepared).toEqual([]);
        expect(ids(result.current.completed)).toEqual(['4']);

        act(() => result.current.filter.set('prepared'));

        expect(result.current.completed).toEqual([]);
        expect(ids(result.current.prepared)).toEqual(['2', '3']);
    });

    it('search never hides active battles', () => {
        const { result } = renderHook(() => useBattleListSections(battles));

        act(() => result.current.search.query.set('goblin'));
        act(() => void vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 1));

        expect(ids(result.current.active)).toEqual(['1']);
        expect(ids(result.current.prepared)).toEqual(['2']);
        expect(ids(result.current.completed)).toEqual(['4']);
        expect(result.current.filter.counts.all).toBe(2);
    });
});
