import { z } from 'zod';

import { AILMENTS_MAX } from '@/systems/wfrp/rules/downtime/types';
import {
    AilmentInputSchema,
    EndeavourSchema,
} from '@/systems/wfrp/server/schemas';

const characterIds = z.array(z.string().min(1).max(64)).min(1).max(50);

export const downtimeSetSchema = z.object({
    endeavour: EndeavourSchema.nullable(),
    ailments: z.array(AilmentInputSchema).max(AILMENTS_MAX).optional(),
});

export const downtimePeriodSchema = z.object({
    days: z.number().int(),
    characterIds,
});

export const downtimePeriodUndoSchema = z.object({
    periodId: z.string().min(1).max(64),
    characterIds,
});

export type DowntimeSetInput = z.infer<typeof downtimeSetSchema>;

export type DowntimePeriodInput = z.infer<typeof downtimePeriodSchema>;

export type DowntimePeriodUndoInput = z.infer<typeof downtimePeriodUndoSchema>;
