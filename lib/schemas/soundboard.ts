import { z } from 'zod';

import {
    BUILTIN_SOUND_IDS,
    MAX_SOUND_BYTES,
    MAX_SOUND_SECONDS,
    MAX_SOUNDS_PER_CAMPAIGN,
    SOUND_NAME_MAX,
} from '@/lib/constants/soundboard';

const soundNameSchema = z.string().trim().min(1).max(SOUND_NAME_MAX);

const styleSchema = z.string().max(24);

export const soundUploadRequestSchema = z.object({
    name: z.string().max(255),
    size: z.number().int().positive().max(MAX_SOUND_BYTES),
    contentType: z.string().max(100),
});

export const createSoundSchema = z.object({
    path: z.string().min(1).max(200),
    name: soundNameSchema,
    durationMs: z
        .number()
        .int()
        .min(1)
        .max(MAX_SOUND_SECONDS * 1000)
        .optional(),
    color: styleSchema.optional(),
    icon: styleSchema.optional(),
});

export const updateSoundSchema = z
    .object({
        name: soundNameSchema,
        volume: z.number().min(0).max(1),
        color: styleSchema.nullable(),
        icon: styleSchema.nullable(),
    })
    .partial()
    .refine((v) => Object.values(v).some((x) => x !== undefined));

export const reorderSoundsSchema = z.object({
    ids: z.array(z.string().max(80)).max(MAX_SOUNDS_PER_CAMPAIGN),
});

export const hiddenBuiltinSchema = z.object({
    ids: z.array(
        z
            .string()
            .startsWith('builtin:')
            .refine((id) => BUILTIN_SOUND_IDS.has(id))
    ),
});

export const playSoundSchema = z.object({
    soundId: z.string().min(1).max(80),
    nonce: z.string().min(1).max(40),
});
