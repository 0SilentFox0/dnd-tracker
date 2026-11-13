import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetTurnState } from '../turn-state';

import { placed } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { TurnStateReset } from '@/lib/utils/rules/systems/types';

const fake = vi.hoisted(() => ({ hooks: [] as TurnStateReset[] }));

vi.mock('@/lib/utils/rules/systems', () => ({
    ruleSystemOf: () => ({
        combat: { turn: { resetState: fake.hooks } },
    }),
}));

const rules = DEFAULT_RULES;

beforeEach(() => {
    fake.hooks.length = 0;
});

describe('resetTurnState', () => {
    it('clears per-turn counters and remembers the start position', () => {
        const p = placed('a', { side: 'ally', at: { x: 2, y: 3 } });

        const dirty = {
            ...p,
            battleData: {
                ...p.battleData,
                movementUsed: 15,
                returnedThisTurn: true,
            },
        };

        const next = resetTurnState(dirty, { rules });

        expect(next.movementUsed).toBe(0);
        expect(next.turnStartPosition).toEqual({ x: 2, y: 3 });
        expect(next.returnedThisTurn).toBeUndefined();
    });

    it('does not add movementUsed when it was unset', () => {
        const next = resetTurnState(
            placed('a', { side: 'ally', at: { x: 0, y: 0 } }),
            { rules }
        );

        expect('movementUsed' in next && next.movementUsed).toBeFalsy();
    });
});

describe('resetTurnState legendary', () => {
    const withLegendary = () => {
        const p = placed('m', { side: 'enemy', at: { x: 0, y: 0 } });

        return {
            ...p,
            battleData: {
                ...p.battleData,
                legendary: { actions: 3, actionsLeft: 1, resistLeft: 1 },
            },
        } as typeof p;
    };

    it('рефілить легендарні дії на початку ходу, але не при keepLegendary', () => {
        expect(
            resetTurnState(withLegendary(), { rules }).legendary?.actionsLeft
        ).toBe(3);
        expect(
            resetTurnState(withLegendary(), { rules, keepLegendary: true })
                .legendary?.actionsLeft
        ).toBe(1);
    });
});

describe('resetTurnState system hooks', () => {
    const base = () => placed('a', { side: 'ally', at: { x: 0, y: 0 } });

    it('runs the hooks in order with the turn scope', () => {
        const calls: string[] = [];

        fake.hooks.push(
            (p, scope) => {
                calls.push(`first:${scope}`);

                return {
                    ...p,
                    battleData: { ...p.battleData, attacksLeft: 1 },
                };
            },
            (p, scope) => {
                calls.push(`second:${scope}`);

                return {
                    ...p,
                    battleData: {
                        ...p.battleData,
                        attacksLeft: (p.battleData.attacksLeft ?? 0) + 1,
                    },
                };
            }
        );

        const next = resetTurnState(base(), { rules });

        expect(calls).toEqual(['first:turn', 'second:turn']);
        expect(next.attacksLeft).toBe(2);
    });

    it('without hooks the result equals the neutral reset', () => {
        const p = base();

        const next = resetTurnState(p, { rules });

        expect(next).toEqual({
            ...p.battleData,
            turnStartPosition: p.battleData.position,
            returnedThisTurn: undefined,
            extraMovement: undefined,
            readied: undefined,
            attacksLeft: undefined,
        });
    });
});
