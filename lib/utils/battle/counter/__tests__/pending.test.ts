import { describe, expect, it } from 'vitest';

import {
    allAnswered,
    counterPendingOf,
    redactCounterForPlayers,
    redactPendingForPlayers,
} from '../pending';
import type { ShownCounter } from '../types';

const shown: ShownCounter = {
    kind: 'counter',
    windowId: 'w1',
    actorId: 'caster',
    spell: { name: 'Fireball', level: 3 },
    deadline: '2026-01-01T00:00:10.000Z',
    offers: [
        { reactorId: 'p', spellId: 'cs', slotLevels: [3], dm: false },
        { reactorId: 'm', spellId: 'cs', slotLevels: [], dm: true },
    ],
};

describe('counter pending', () => {
    it('drops DM offers and the spell for players', () => {
        const out = redactCounterForPlayers(shown);

        expect(out.spell).toBeUndefined();
        expect(out.offers.map((o) => o.reactorId)).toEqual(['p']);
        expect(out.dmDeciding).toBe(true);
    });

    it('does not flag dmDeciding when every offer is public', () => {
        const out = redactCounterForPlayers({
            ...shown,
            offers: [shown.offers[0]],
        });

        expect(out.dmDeciding).toBeUndefined();
    });

    it('passes other pauses through', () => {
        const crit = { action: 'spell', actorId: 'a', triggers: [] };

        expect(redactPendingForPlayers(crit)).toBe(crit);
        expect(redactPendingForPlayers(null)).toBeNull();
    });

    it('recognises a counter pause and tracks answers', () => {
        expect(counterPendingOf({ shown, hidden: {} })?.shown.windowId).toBe(
            'w1'
        );
        expect(counterPendingOf({ shown: { triggers: [] }, hidden: {} })).toBeNull();
        expect(allAnswered(shown)).toBe(false);
        expect(
            allAnswered({
                ...shown,
                offers: shown.offers.map((o) => ({ ...o, answer: 'pass' })),
            })
        ).toBe(true);
    });
});
