import { describe, expect, it } from 'vitest';

import type { CorruptionState, Mutation } from '../types';
import { planCorruptionUndo } from '../undo';

const m = (id: string): Mutation => ({
    id,
    at: 't',
    kind: 'mental',
    roll: 1,
    text: 'x',
    effects: [],
});

const last = (after: { points: number; mutationId?: string }) => ({
    id: 'g',
    at: 't',
    reason: '',
    before: { points: 3 },
    after,
    summary: { points: 1, total: after.points, threshold: 6 },
});

const withMutation: CorruptionState = {
    points: 8,
    mutations: [m('a'), m('g')],
    last: last({ points: 8, mutationId: 'g' }),
};

describe('planCorruptionUndo', () => {
    it('restores points and drops the granted mutation', () => {
        const r = planCorruptionUndo(withMutation, 'g');

        expect(r).toEqual({
            ok: true,
            state: { points: 3, mutations: [m('a')] },
        });
        expect(r.ok && 'last' in r.state).toBe(false);
    });

    it('leaves mutations alone when none was granted', () => {
        const state: CorruptionState = {
            points: 5,
            mutations: [m('a')],
            last: last({ points: 5 }),
        };

        expect(planCorruptionUndo(state, 'g')).toEqual({
            ok: true,
            state: { points: 3, mutations: [m('a')] },
        });
    });

    it.each([
        ['no state', undefined, 'g'],
        ['no last', { points: 8, mutations: [] }, 'g'],
        ['other grant', withMutation, 'x'],
        ['points drifted', { ...withMutation, points: 9 }, 'g'],
        [
            'mutation not last',
            { ...withMutation, mutations: [m('g'), m('b')] },
            'g',
        ],
    ] as const)('stale: %s', (_n, state, id) => {
        expect(
            planCorruptionUndo(state as CorruptionState | undefined, id)
        ).toEqual({ ok: false, error: 'CORRUPTION_STALE' });
    });

    it('a second undo is stale', () => {
        const r = planCorruptionUndo(withMutation, 'g');

        expect(r.ok && planCorruptionUndo(r.state, 'g')).toEqual({
            ok: false,
            error: 'CORRUPTION_STALE',
        });
    });
});
