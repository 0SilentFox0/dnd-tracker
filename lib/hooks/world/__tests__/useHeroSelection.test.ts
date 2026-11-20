// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useHeroSelection } from '../useHeroSelection';

const hero = (id: string) => ({ id, name: id, avatar: null });

describe('useHeroSelection', () => {
    it('toggles heroes on and off', () => {
        const heroes = [hero('a'), hero('b')];

        const { result } = renderHook(() => useHeroSelection(heroes));

        act(() => result.current.toggle('a'));
        expect(result.current.selected).toEqual(['a']);

        act(() => result.current.toggle('b'));
        expect(result.current.selected).toEqual(['a', 'b']);
        expect(result.current.allSelected).toBe(true);

        act(() => result.current.toggle('a'));
        expect(result.current.selected).toEqual(['b']);
    });

    it('setOnly replaces the selection and selectAll toggles everything', () => {
        const heroes = [hero('a'), hero('b')];

        const { result } = renderHook(() => useHeroSelection(heroes));

        act(() => result.current.setOnly(['b']));
        expect(result.current.selected).toEqual(['b']);

        act(() => result.current.selectAll());
        expect(result.current.selected).toEqual(['a', 'b']);

        act(() => result.current.selectAll());
        expect(result.current.selected).toEqual([]);
    });

    it('drops heroes that left the roster', () => {
        let heroes = [hero('a'), hero('b')];

        const { result, rerender } = renderHook(() => useHeroSelection(heroes));

        act(() => result.current.setOnly(['a', 'b']));

        heroes = [hero('b')];
        rerender();

        expect(result.current.selected).toEqual(['b']);
        expect(result.current.allSelected).toBe(true);
    });

    it('is never allSelected for an empty roster', () => {
        const { result } = renderHook(() => useHeroSelection([]));

        expect(result.current.allSelected).toBe(false);
    });
});
