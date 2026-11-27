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
        {
            id: 'rage',
            name: 'Шал',
            level: 1,
            dice: 0,
            cost: 'action',
            targeting: { kind: 'enemy' },
            resolution: { kind: 'save', ability: 'wisdom', onSuccess: 'none' },
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

const rules = vi.hoisted(() => ({
    attackDice: 6 as number | undefined,
    saveDice: 4 as number | undefined,
}));

vi.mock('../useBattleRules', () => ({
    useBattleRules: () => ({
        tested: false,
        dice: 6,
        attackDice: rules.attackDice,
        saveDice: rules.saveDice,
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

    it('auto roll fills missing saving throws with magic.saveDice sides', async () => {
        const scene = fakeScene({
            isDM: true,
            knownSpells: ['rage'],
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

        expect(result.current.view.saveTargets).toHaveLength(1);
        act(() => result.current.actions.aiDamage());

        const save = result.current.state.saves.gob;

        expect(save).toBeGreaterThanOrEqual(1);
        expect(save).toBeLessThanOrEqual(4);

        act(() => result.current.actions.setSave('gob', 7));
        act(() => result.current.actions.aiDamage());
        expect(result.current.state.saves.gob).toBe(7);
    });

    it('auto roll leaves saves empty when the system rolls no save die', async () => {
        rules.saveDice = undefined;

        try {
            const scene = fakeScene({
                isDM: true,
                knownSpells: ['rage'],
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
            act(() => result.current.actions.aiDamage());

            expect(result.current.state.saves.gob).toBeUndefined();
        } finally {
            rules.saveDice = 4;
        }
    });

    it('openSpell skips the book and goes straight to targeting', async () => {
        const scene = fakeScene({
            isDM: true,
            knownSpells: ['bolt', 'rage'],
            slots: {
                '1': { max: 2, current: 2 },
                universal: { max: 2, current: 2 },
            },
        });

        const { result } = renderHook(() => useSpellBook(scene.me), {
            wrapper: scene.wrapper,
        });

        act(() => result.current.actions.openSpell(1, 'rage'));

        await waitFor(() => expect(result.current.state.step).toBe('targets'));
        expect(result.current.view.selected?.id).toBe('rage');
        expect(result.current.view.autoPicking).toBe(false);
    });

    it('openSpell without a free slot stops on the spell page', async () => {
        const scene = fakeScene({
            isDM: true,
            knownSpells: ['rage'],
            slots: {},
        });

        const { result } = renderHook(() => useSpellBook(scene.me), {
            wrapper: scene.wrapper,
        });

        act(() => result.current.actions.openSpell(1, 'rage'));

        await waitFor(() => expect(result.current.state.step).toBe('spell'));
        expect(result.current.view.autoPicking).toBe(false);
    });
});
