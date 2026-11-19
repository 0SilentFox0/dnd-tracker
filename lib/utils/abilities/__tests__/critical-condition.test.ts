import { describe, expect, it } from 'vitest';

import { makeParticipant } from './fixtures';

import { evaluateCondition } from '@/lib/utils/abilities/registry/conditions';
import type { AbilityEvent } from '@/types/abilities';

const owner = makeParticipant({ id: 'o' });

const hit = (crit?: boolean): AbilityEvent => ({
    type: 'hit',
    actorId: 'o',
    targetId: 't',
    attackKind: 'melee',
    damage: 5,
    crit,
});

const check = (event: AbilityEvent | null) =>
    evaluateCondition(
        { type: 'critical' },
        { owner, event, participants: [owner] }
    );

describe('critical condition', () => {
    it('true only on a critical hit event', () => {
        expect(check(hit(true))).toBe(true);
        expect(check(hit(false))).toBe(false);
        expect(check(hit())).toBe(false);
        expect(check(null)).toBe(false);
    });
});
