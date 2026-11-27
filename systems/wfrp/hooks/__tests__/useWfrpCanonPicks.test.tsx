// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useWfrpCanonPicks } from '../useWfrpCanonPicks';

describe('useWfrpCanonPicks', () => {
    it('counts every rapid career-skill step fired before a re-render', () => {
        const { result } = renderHook(() => useWfrpCanonPicks('c1'));

        const step = result.current.stepSkill;

        act(() => {
            step('x', 1, 3);
            step('x', 1, 3);
            step('x', 1, 3);
        });

        expect(result.current.skills.x).toBe(3);
    });

    it('clamps a skill step to the given max and keeps the career total at 8', () => {
        const { result } = renderHook(() => useWfrpCanonPicks('c1'));

        act(() => {
            for (let i = 0; i < 5; i++) result.current.stepSkill('x', 1, 3);
        });

        expect(result.current.skills.x).toBe(3);

        act(() => {
            for (let i = 0; i < 3; i++) result.current.stepSkill('y', 1, 3);
            for (let i = 0; i < 3; i++) result.current.stepSkill('z', 1, 3);
        });

        expect(result.current.skills).toEqual({ x: 3, y: 3, z: 2 });
    });

    it('counts rapid characteristic steps and caps them at the distribution cap', () => {
        const { result } = renderHook(() => useWfrpCanonPicks('c1'));

        const step = result.current.stepBonus;

        act(() => {
            step('ws', 1, 6);
            step('ws', 1, 6);
            step('int', 1, 6);
        });

        expect(result.current.distribution).toEqual({ ws: 2, int: 1 });

        act(() => {
            for (let i = 0; i < 6; i++) result.current.stepBonus('ws', 1, 6);
        });

        expect(result.current.distribution).toEqual({ ws: 5, int: 1 });
    });

    it('resets career-bound picks when the career changes', () => {
        const { result, rerender } = renderHook(
            ({ id }) => useWfrpCanonPicks(id),
            { initialProps: { id: 'c1' } }
        );

        act(() => result.current.stepSkill('x', 1, 3));
        rerender({ id: 'c2' });

        expect(result.current.skills).toEqual({});
    });
});
