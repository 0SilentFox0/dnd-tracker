import { describe, expect, it } from 'vitest';

import { questSchema } from '@/lib/schemas/quests';
import { objectiveView } from '@/lib/utils/quests/privacy';

describe('quest privacy', () => {
    const secret = {
        id: 'o1',
        title: 'secret password',
        completed: true,
        visible: false,
        sortOrder: 0,
    };

    it('removes hidden objective text, identity and state for players', () => {
        expect(objectiveView(secret, false)).toEqual({ hidden: true });
        expect(JSON.stringify(objectiveView(secret, false))).not.toContain(
            'secret'
        );
    });
    it('allows the DM to edit hidden objectives', () => {
        expect(objectiveView(secret, true)).toMatchObject({
            title: 'secret password',
            completed: true,
            hidden: false,
        });
    });
    it('defaults new quests and objectives to hidden', () => {
        const parsed = questSchema.parse({
            title: 'Quest',
            objectives: [{ title: 'Goal' }],
        });

        expect(parsed.visible).toBe(false);
        expect(parsed.objectives[0].visible).toBe(false);
    });
    it('rejects excessive objectives and unknown write fields', () => {
        expect(
            questSchema.safeParse({ title: 'Q', userId: 'someone' }).success
        ).toBe(false);
        expect(
            questSchema.safeParse({
                title: 'Q',
                objectives: Array.from({ length: 101 }, () => ({ title: 'x' })),
            }).success
        ).toBe(false);
    });
});
