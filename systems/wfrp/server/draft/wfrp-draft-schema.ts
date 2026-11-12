import { z } from 'zod';

import { GoalKind } from '@/lib/constants/characters';
import type {
    WfrpDraftIdentityInput,
    WfrpDraftInput,
} from '@/systems/wfrp/api/types';

const roll = z.array(z.number().int()).max(12);

const goals = z
    .array(
        z.object({
            text: z.string().min(1).max(500),
            kind: z.enum([
                GoalKind.MAIN,
                GoalKind.PERSONAL,
                GoalKind.INNER,
                GoalKind.SECRET,
            ]),
        })
    )
    .max(5)
    .optional();

const identity = {
    name: z.string().trim().min(1).max(100),
    alignment: z.string().max(100).optional(),
    background: z.string().max(4000).optional(),
    avatar: z.string().optional(),
    goals,
};

export const wfrpDraftIdentitySchema = z.object(
    identity
) satisfies z.ZodType<WfrpDraftIdentityInput>;

export const wfrpDraftSchema = z.object({
    ...identity,
    speciesId: z.string().min(1).max(100),
    career: z.object({
        mode: z.enum(['rolled', 'choice', 'free']),
        careerId: z.string().min(1).max(100),
    }),
    stats: z.discriminatedUnion('mode', [
        z.object({ mode: z.literal('rolled'), rolls: roll }),
        z.object({
            mode: z.literal('rearranged'),
            rolls: roll,
            arranged: roll,
        }),
        z.object({ mode: z.literal('free'), points: roll }),
    ]),
    talents: z.array(z.string().min(1).max(100)).max(5),
}) satisfies z.ZodType<WfrpDraftInput>;
