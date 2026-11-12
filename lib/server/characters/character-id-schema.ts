import { z } from 'zod';

export const characterIdSchema = z.object({
    characterId: z.string().min(1).max(100),
});
