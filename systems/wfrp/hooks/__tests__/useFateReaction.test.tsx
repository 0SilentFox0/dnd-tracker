// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { fateReactionOp } from '@/systems/wfrp/api/battle';
import { useFateReaction } from '@/systems/wfrp/hooks/useFateReaction';

const offer = (holderId: string) => ({
    key: `negate:${holderId}:0`,
    holderId,
    actorId: 'gob',
    cost: 'x',
});

const setup = (
    holders: string[],
    opts: { isDM?: boolean; triggers?: unknown[] } = {}
) => {
    const scene = fakeScene({ system: 'wfrp', isDM: opts.isDM });

    scene.battle.pendingChoice = {
        action: 'attack',
        actorId: 'gob',
        triggers: opts.triggers ?? [],
        negations: holders.map(offer),
    } as never;

    const hook = renderHook(() => useFateReaction(), {
        wrapper: scene.wrapper,
    });

    return { scene, hook };
};

describe('useFateReaction', () => {
    it('opens for the controller of every holder', () => {
        const { hook } = setup(['me']);

        expect(hook.result.current.open).toBe(true);
        expect(hook.result.current.waiting).toBe(false);
    });

    it('a player who does not hold the Fate only waits', () => {
        const { hook } = setup(['ally']);

        expect(hook.result.current.open).toBe(false);
        expect(hook.result.current.waiting).toBe(true);
    });

    it('needs to hold every offered holder', () => {
        const { hook } = setup(['me', 'ally']);

        expect(hook.result.current.open).toBe(false);
        expect(hook.result.current.waiting).toBe(true);
    });

    it('the DM answers for anyone and never waits', () => {
        const { hook } = setup(['ally'], { isDM: true });

        expect(hook.result.current.open).toBe(true);
        expect(hook.result.current.waiting).toBe(false);
    });

    it('stays closed without offers or while a crit choice is still open', () => {
        const none = setup([]);

        expect(none.hook.result.current).toMatchObject({
            open: false,
            waiting: false,
            rows: [],
        });

        const crit = setup(['me'], {
            triggers: [{ key: 'k', actorId: 'me', targetId: 'gob' }],
        });

        expect(crit.hook.result.current.open).toBe(false);
        expect(crit.hook.result.current.waiting).toBe(false);
    });

    it('rows carry holder and attacker names, answer sends one system op', () => {
        const { scene, hook } = setup(['me']);

        expect(hook.result.current.rows).toEqual([
            {
                key: 'negate:me:0',
                holderName: 'Фрейда',
                attackerName: 'Гоблін',
            },
        ]);

        hook.result.current.answer({ 'negate:me:0': true });

        expect(scene.value.actions.system.mutate).toHaveBeenCalledWith(
            fateReactionOp({ 'negate:me:0': true })
        );
    });
});
