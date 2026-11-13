import { z } from 'zod';

import { FORTUNE_INPUT } from '../rules/percentile/fortune';

import type { SystemSlot } from '@/lib/utils/rules/systems/slot';

const roll = z.number().int().min(1).max(100);

const Body = z.object({
    system: z
        .object({
            key: z.literal('wfrp'),
            data: z.object({ kind: z.enum(['reroll', 'sl']) }),
        })
        .optional(),
    secondRoll: roll.optional(),
});

export const WfrpFortuneInputSchema = Body.transform(({ system, secondRoll }): SystemSlot | undefined => {
        if (!system) return undefined;

        const { kind } = system.data;

        return FORTUNE_INPUT.write({
            kind,
            ...(kind === 'reroll' &&
                secondRoll !== undefined && { manualReroll: secondRoll }),
        });
    });
