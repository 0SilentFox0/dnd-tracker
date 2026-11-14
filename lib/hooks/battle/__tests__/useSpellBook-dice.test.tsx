// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const lib = vi.hoisted(() => ({
    spells: [
        {
            id: 'bolt',
            name: 'Стріла',
            level: 1,
            dice: 1,
            cost: 'action',
            targeting: { kind: 'enemy' },
            resolution: { kind: 'attack' },
        },
    ],
}));

vi.mock('@/lib/hooks/spells', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/hooks/spells')>()),
    useSpells: vi.fn(() => ({ data: undefined })),
    useSpellsByIds: vi.fn((_c: string, ids: string[]) => ({
        data: lib.spells.filter((s) => ids.includes(s.id)),
    })),
}));

const rules = vi.hoisted(() => ({ attackDice: 6 as number | undefined }));

vi.mock('../useBattleRules', () => ({
    useBattleRules: () => ({
        tested: false,
        dice: 6,
        attackDice: rules.attackDice,
    }),
}));

import { useSpellBook } from '../useSpellBook';
import { fakeScene } from './fake-scene';

describe('useSpellBook: aiDamage uses the magic attack die', () => {
    it('rolls attack dice with magic.attackDice sides', async () => {
        const scene = fakeScene({
            isDM: true,
            knownSpells: ['bolt'],
            slots: { '1': { max: 2, current: 2 } },
        });

        const { result } = renderHook(() => useSpellBook(scene.me), {
            wrapper: scene.wrapper,
        });

        act(() => result.current.actions.open(1));
        await waitFor(() => expect(result.current.view.spells).toHaveLength(1));
        act(() => result.current.actions.pick(result.current.view.spells[0]));
        act(() => result.current.actions.toTargets());
        act(() => result.current.actions.toggleTarget('gob'));
        act(() => result.current.actions.confirmTargets());

        for (let i = 0; i < 30; i++) {
            act(() => result.current.actions.aiDamage());

            const roll = result.current.state.attacks.gob;

            expect(roll).toBeGreaterThanOrEqual(1);
            expect(roll).toBeLessThanOrEqual(6);
            act(() => result.current.actions.back());
            act(() => result.current.actions.confirmTargets());
        }
    });

    it('exposes no attack targets when magic.attackDice is undefined', async () => {
        rules.attackDice = undefined;

        try {
            const scene = fakeScene({
                isDM: true,
                knownSpells: ['bolt'],
                slots: { '1': { max: 2, current: 2 } },
            });

            const { result } = renderHook(() => useSpellBook(scene.me), {
                wrapper: scene.wrapper,
            });

            act(() => result.current.actions.open(1));
            await waitFor(() =>
                expect(result.current.view.spells).toHaveLength(1)
            );
            act(() =>
                result.current.actions.pick(result.current.view.spells[0])
            );
            act(() => result.current.actions.toTargets());
            act(() => result.current.actions.toggleTarget('gob'));
            act(() => result.current.actions.confirmTargets());

            expect(result.current.view.attackTargets).toEqual([]);
            act(() => result.current.actions.aiDamage());
            expect(result.current.state.attacks.gob).toBeUndefined();
        } finally {
            rules.attackDice = 6;
        }
    });
});
