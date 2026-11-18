import { describe, expect, it } from 'vitest';

import { context } from './fixtures';

import { completeMutation } from '@/lib/server/battles/mutations/complete/complete-mutation';
import { eventTextOf } from '@/lib/utils/battle/log/__tests__/event-text';
import { pendingSlot } from '@/systems/morale/__tests__/pending';

describe('complete mutation', () => {
    it('завершує бій з вказаним результатом', () => {
        const out = completeMutation(context(), { result: 'defeat' });

        expect(out.scene).toMatchObject({ status: 'completed' });
        expect(out.scene?.completedAt).toBeInstanceOf(Date);
        expect(eventTextOf(out.events[0])).toContain('Поразка');
    });

    it('скидає паузу моралі', () => {
        const ctx = context();

        const out = completeMutation(
            {
                ...ctx,
                scene: {
                    ...ctx.scene,
                    sceneState: pendingSlot({
                        participantId: 'hero',
                        d10Roll: 1,
                        moraleResult: {
                            shouldSkipTurn: true,
                            hasExtraTurn: false,
                            moralePositive: false,
                            message: '',
                        },
                    }),
                },
            },
            {}
        );

        expect(out.scene?.sceneState).toBeNull();
    });

    it('без результату — перемога за замовчуванням', () => {
        expect(
            eventTextOf(completeMutation(context(), {}).events[0])
        ).toContain('Перемога');
    });
});
