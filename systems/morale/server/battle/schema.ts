import { z } from 'zod';

export const moraleCheckSchema = z.object({
    participantId: z.string(),
    d10Roll: z.number().min(1).max(10),
});

export type MoraleCheckInput = z.infer<typeof moraleCheckSchema>;
