import { z } from 'zod';

export const avatarCommitSchema = z.object({
    url: z.string().url().max(2000),
});
