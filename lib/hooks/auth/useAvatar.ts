'use client';

import { useRef, useState } from 'react';

import { profileApi } from '@/lib/api/profile';
import {
    AVATAR_SOURCE_TYPES,
    MAX_AVATAR_SOURCE_BYTES,
    USER_AVATAR_SIZE,
} from '@/lib/constants/profile';
import { YEAR_CACHE_SECONDS } from '@/lib/constants/storage';
import { useNotify } from '@/lib/hooks/common';
import { useTranslator } from '@/lib/i18n/use-translator';
import { createClient } from '@/lib/supabase/client';
import {
    cropSquareToBlob,
    ImageResizeError,
} from '@/lib/utils/common/image-resize';

const isSourceType = (type: string) =>
    (AVATAR_SOURCE_TYPES as readonly string[]).includes(type);

export function useAvatar() {
    const t = useTranslator('common');

    const tRoot = useTranslator();

    const notify = useNotify();

    const [pending, setPending] = useState(false);

    const lock = useRef(false);

    const run = async (task: () => Promise<void>) => {
        if (lock.current) return;

        lock.current = true;
        setPending(true);

        try {
            await task();
        } catch (err) {
            console.error('avatar', err);
            void notify(
                err instanceof ImageResizeError
                    ? tRoot(err.key)
                    : t('profile.avatar.failed')
            );
            lock.current = false;
            setPending(false);

            return;
        }

        try {
            // refreshing the session fires onAuthStateChange, which updates the header
            await createClient().auth.refreshSession();
        } catch (err) {
            console.error('avatar session refresh', err);
        } finally {
            lock.current = false;
            setPending(false);
        }
    };

    const upload = async (file: File) => {
        if (!isSourceType(file.type))
            return void notify(t('profile.avatar.badType'));

        if (file.size > MAX_AVATAR_SOURCE_BYTES)
            return void notify(t('profile.avatar.tooLarge'));

        await run(async () => {
            const blob = await cropSquareToBlob(file, USER_AVATAR_SIZE);

            const ticket = await profileApi.avatarTicket(blob.type);

            const { error } = await createClient()
                .storage.from(ticket.bucket)
                .uploadToSignedUrl(ticket.path, ticket.token, blob, {
                    contentType: blob.type,
                    cacheControl: YEAR_CACHE_SECONDS,
                });

            if (error) throw error;

            await profileApi.commitAvatar(ticket.publicUrl);
        });
    };

    const remove = () =>
        run(async () => {
            await profileApi.removeAvatar();
        });

    return { upload, remove, pending };
}
