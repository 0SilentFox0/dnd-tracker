import { z } from 'zod';

import { USER_AVATAR_CONTENT_TYPES } from '@/lib/constants/profile';

export const avatarCommitSchema = z.object({
    url: z.string().url().max(2000),
});

export const avatarTicketSchema = z.object({
    contentType: z.enum(USER_AVATAR_CONTENT_TYPES),
});
