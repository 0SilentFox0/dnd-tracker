import { z } from 'zod';

import { CONTENT_KINDS } from '@/lib/constants/content-kinds';

const MAX_IDS = 500;

const COPY_KINDS = [...CONTENT_KINDS, 'maps'] as const;

export const copyRequestSchema = z.object({
    items: z
        .array(
            z.object({
                kind: z.enum(COPY_KINDS),
                ids: z.array(z.string().min(1)).min(1).max(MAX_IDS),
            })
        )
        .min(1)
        .max(COPY_KINDS.length),
    targets: z.union([
        z.object({
            campaignIds: z.array(z.string().min(1)).min(1).max(100),
        }),
        z.object({ all: z.literal(true) }),
    ]),
    dryRun: z.boolean().optional(),
});
