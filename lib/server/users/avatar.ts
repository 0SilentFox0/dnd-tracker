import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    USER_AVATARS_BUCKET,
    type UserAvatarContentType,
} from '@/lib/constants/profile';
import { createAdminClient } from '@/lib/supabase/admin';
import { userAvatars } from '@/lib/supabase/user-avatar-storage';
import type { Result } from '@/types/common';
import type { SlideUploadTicket } from '@/types/show';

export const createUserAvatarTicket = (
    userId: string,
    contentType: UserAvatarContentType
): Promise<Result<SlideUploadTicket>> =>
    userAvatars.createTicket(userId, contentType);

async function listObjectUrls(userId: string, except?: string) {
    const storage = createAdminClient().storage.from(USER_AVATARS_BUCKET);

    const { data } = await storage.list(userId);

    return (data ?? [])
        .map((o) => storage.getPublicUrl(`${userId}/${o.name}`).data.publicUrl)
        .filter((u) => u !== except);
}

// GoTrue merges user_metadata on admin update; a null value deletes the key
async function setAvatarMetadata(userId: string, url: string | null) {
    const { error } = await createAdminClient().auth.admin.updateUserById(
        userId,
        { user_metadata: { custom_avatar_url: url } }
    );

    return !error;
}

export async function commitUserAvatar(
    userId: string,
    url: string
): Promise<Result<{ avatarUrl: string }>> {
    if (!userAvatars.ownedPath(userId, url))
        return { ok: false, message: API_ERRORS.INVALID_BODY };

    if (!(await setAvatarMetadata(userId, url)))
        return { ok: false, message: API_ERRORS.INTERNAL };

    await userAvatars.remove(userId, await listObjectUrls(userId, url));

    return { ok: true, value: { avatarUrl: url } };
}

export async function removeUserAvatar(
    userId: string
): Promise<Result<{ ok: true }>> {
    if (!(await setAvatarMetadata(userId, null)))
        return { ok: false, message: API_ERRORS.INTERNAL };

    await userAvatars.remove(userId, await listObjectUrls(userId));

    return { ok: true, value: { ok: true } };
}
