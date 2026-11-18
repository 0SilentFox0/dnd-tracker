// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type HpChange, useDamageShake, useHpChange } from '../useHpChange';

import type { FxImpact } from '@/lib/utils/battle/fx';

describe('useHpChange', () => {
    it('на першому рендері нічого; при зміні — дельта і новий id', () => {
        const { result, rerender } = renderHook(({ hp }) => useHpChange(hp), {
            initialProps: { hp: 20 },
        });

        expect(result.current).toBeNull();

        rerender({ hp: 12 });

        expect(result.current).toEqual({
            delta: -8,
            hp: 12,
            id: 1,
            impact: null,
        });

        rerender({ hp: 20 });

        expect(result.current).toEqual({
            delta: 8,
            hp: 20,
            id: 2,
            impact: null,
        });
    });

    it('ціль із відром HP: число з impact.delta, удар без зміни відра теж дає зміну, мова про той самий удар — один раз', () => {
        const hit = (actionId: string, delta: number): FxImpact => ({
            element: 'fire',
            kind: 'damage',
            delayMs: 600,
            actionId,
            delta,
        });

        const { result, rerender } = renderHook(
            ({ hp, impact }) => useHpChange(hp, impact),
            { initialProps: { hp: 75, impact: hit('a1', -3) as FxImpact } }
        );

        expect(result.current).toBeNull();

        rerender({ hp: 75, impact: hit('a2', -3) });

        expect(result.current).toMatchObject({ delta: -3, id: 1 });

        rerender({ hp: 40, impact: hit('a3', -9) });

        expect(result.current).toMatchObject({ delta: -9, hp: 40, id: 2 });

        rerender({ hp: 40, impact: hit('a3', -9) });

        expect(result.current?.id).toBe(2);
    });

    it('вплив знімається в момент зміни HP; пізніший вплив без зміни HP його не змінює', () => {
        const hit: FxImpact = { element: 'fire', kind: 'damage', delayMs: 600 };

        const { result, rerender } = renderHook(
            ({ hp, impact }) => useHpChange(hp, impact),
            { initialProps: { hp: 20, impact: null as FxImpact | null } }
        );

        rerender({ hp: 12, impact: hit });

        const snap = result.current;

        expect(snap).toEqual({ delta: -8, hp: 12, id: 1, impact: hit });

        rerender({ hp: 12, impact: null });

        expect(result.current).toBe(snap);

        rerender({
            hp: 12,
            impact: { element: 'radiant', kind: 'damage', delayMs: 400 },
        });

        expect(result.current).toBe(snap);
    });
});

describe('useDamageShake', () => {
    afterEach(() => vi.useRealTimers());

    it('тремтіння стартує одразу, без затримки', () => {
        const animate = vi.fn();

        const { rerender } = renderHook(
            ({ change }) => {
                const ref = useDamageShake<HTMLDivElement>(change);

                if (!ref.current)
                    ref.current = { animate } as unknown as HTMLDivElement;

                return ref;
            },
            { initialProps: { change: null as HpChange | null } }
        );

        rerender({
            change: {
                delta: -5,
                hp: 25,
                id: 1,
                impact: { element: 'fire', kind: 'damage', delayMs: 300 },
            },
        });

        expect(animate).toHaveBeenCalledTimes(1);
    });
});
