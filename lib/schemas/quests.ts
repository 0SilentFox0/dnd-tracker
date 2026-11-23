import { z } from 'zod';
export const questSchema = z
    .object({
        title: z.string().trim().min(1).max(200),
        description: z.string().max(10000).default(''),
        kind: z.enum(['main', 'side']).default('main'),
        status: z.enum(['active', 'completed', 'failed']).default('active'),
        visible: z.boolean().default(false),
        notes: z.string().max(10000).default(''),
        reward: z.string().max(2000).default(''),
        markerId: z.string().min(1).nullable().default(null),
        objectives: z
            .array(
                z
                    .object({
                        title: z.string().trim().min(1).max(500),
                        completed: z.boolean().default(false),
                        visible: z.boolean().default(false),
                    })
                    .strict()
            )
            .max(100)
            .default([]),
    })
    .strict();
export const questTrackingSchema = z.object({ tracked: z.boolean() }).strict();
export type QuestInput = z.infer<typeof questSchema>;
