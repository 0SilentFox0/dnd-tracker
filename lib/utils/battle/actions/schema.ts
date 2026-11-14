import { z } from 'zod';

const id = z.string().min(1);

const legendaryOptionSchema = z.discriminatedUnion('kind', [
    z.object({
        kind: z.literal('attack'),
        attackIndex: z.number().int().min(0).max(50),
        targetId: id,
    }),
    z.object({
        kind: z.enum(['ability', 'lair']),
        abilityKey: id,
        targetIds: z.array(id).max(20).optional(),
    }),
]);

export const legendaryActionSchema = z.object({
    action: z.literal('legendary'),
    participantId: id,
    option: legendaryOptionSchema,
});

export type LegendaryActionBody = z.infer<typeof legendaryActionSchema>;
