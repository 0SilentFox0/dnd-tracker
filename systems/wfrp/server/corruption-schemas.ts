import { z } from 'zod';

import {
    EXPOSURE_DEGREES,
    EXPOSURE_SKILLS,
    GRANT_MAX as CORRUPTION_GRANT_MAX,
    REASON_MAX as CORRUPTION_REASON_MAX,
} from '@/systems/wfrp/rules/corruption/constants';

const reason = z.string().trim().min(1).max(CORRUPTION_REASON_MAX);

export const corruptionManualGrantSchema = z
    .object({
        points: z.number().int().min(1).max(CORRUPTION_GRANT_MAX),
        reason,
    })
    .strict();

export const corruptionExposureGrantSchema = z
    .object({
        exposure: z.object({
            degree: z.enum(EXPOSURE_DEGREES),
            skill: z.enum(EXPOSURE_SKILLS),
        }),
        reason,
    })
    .strict();

export const corruptionGrantSchema = z.union([
    corruptionManualGrantSchema,
    corruptionExposureGrantSchema,
]);

export const corruptionUndoSchema = z.object({
    grantId: z.string().min(1).max(64),
});

export type CorruptionGrantInput = z.infer<typeof corruptionGrantSchema>;

export type CorruptionUndoInput = z.infer<typeof corruptionUndoSchema>;
