import { z } from 'zod';

import { flagBase } from '@/lib/utils/abilities/schema/flag-base';

export const RETALIATION_FLAG_SCHEMAS = [
    z.object({ ...flagBase, flag: z.literal('noRetaliation') }),
    z.object({ ...flagBase, flag: z.literal('unlimitedRetaliation') }),
    z.object({
        ...flagBase,
        flag: z.literal('extraRetaliations'),
        count: z.number().int().min(1).max(5),
    }),
] as const;
