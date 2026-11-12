import { z } from 'zod';

export const advanceSchema = z.object({
    kind: z.enum(['characteristic', 'skill', 'talent']),
    key: z.string().min(1).max(60),
});

export type AdvanceInput = z.infer<typeof advanceSchema>;

export const careerSetSchema = z.object({
    careerId: z.string().min(1).max(60),
});

export const careerAdvanceSchema = z.object({ force: z.boolean().optional() });

export type CareerSetInput = z.infer<typeof careerSetSchema>;
export type CareerAdvanceInput = z.infer<typeof careerAdvanceSchema>;
