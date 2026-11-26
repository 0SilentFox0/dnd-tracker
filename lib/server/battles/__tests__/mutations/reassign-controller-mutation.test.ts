import { describe, expect, it } from 'vitest';

import { context, participant } from './fixtures';

import {
    reassignControllerMutation,
    reassignControllerSchema,
} from '@/lib/server/battles/mutations/reassign-controller/reassign-controller-mutation';

describe('reassign-controller mutation', () => {
    const ctx = () =>
        context({
            isDM: true,
            userId: 'dm-user',
            participants: [
                participant('h1', { controlledBy: 'gone', name: 'Ivan' }),
                participant('h2', { controlledBy: 'p2', name: 'Markel' }),
            ],
        });

    it('hands the user participants to the DM with one log event each', () => {
        const out = reassignControllerMutation(ctx(), { userId: 'gone' });

        expect(out.participants.map((p) => p.basicInfo.controlledBy)).toEqual([
            'dm',
            'p2',
        ]);
        expect(out.events).toHaveLength(1);
        expect(out.scene).toBeUndefined();
    });

    it('requires a user id', () => {
        expect(reassignControllerSchema.safeParse({}).success).toBe(false);
    });
});
