import { z } from 'zod';

import { flagBase } from '@/lib/utils/abilities/schema/flag-base';

export const MORALE_FLAG_SCHEMAS = [
    z.object({
        ...flagBase,
        flag: z.literal('moraleChance'),
        percent: z.number().int().min(1).max(100),
    }),
    z.object({ ...flagBase, flag: z.literal('noNegativeMorale') }),
    z.object({ ...flagBase, flag: z.literal('ignoreMorale') }),
    z.object({
        ...flagBase,
        flag: z.literal('minMorale'),
        value: z.number().int().min(-3).max(3),
    }),
] as const;
