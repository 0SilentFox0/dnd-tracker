import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    MAX_TRACK_BYTES,
    TRACK_CONTENT_TYPES,
    TRACK_EXTENSIONS,
    TRACK_FORMATS,
    type TrackFormat,
} from '@/lib/constants/music';
import { MAX_SOUND_BYTES, SOUNDBOARD_BUCKET } from '@/lib/constants/soundboard';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureBucket } from '@/lib/supabase/buckets';
import { bucketObjectPath } from '@/lib/utils/common/image-url';
import type { TrackUploadTicket } from '@/types/audio';
import type { Result } from '@/types/common';

type Admin = ReturnType<typeof createAdminClient>;
type Bucket = ReturnType<Admin['storage']['from']>;

const SOUND_OBJECT = new RegExp(
    `^([^/]+)/[a-f0-9]{32}\\.(${TRACK_EXTENSIONS.join('|')})$`
);

export function soundPathOwnedBy(path: string, campaignId: string): boolean {
    return SOUND_OBJECT.exec(path)?.[1] === campaignId;
}

async function soundBucket(supabase: Admin): Promise<Result<Bucket>> {
    const ensured = await ensureBucket(supabase, SOUNDBOARD_BUCKET, {
        public: true,
        fileSizeLimit: MAX_SOUND_BYTES,
        allowedMimeTypes: TRACK_CONTENT_TYPES,
    });

    return ensured.ok
        ? { ok: true, value: supabase.storage.from(SOUNDBOARD_BUCKET) }
        : ensured;
}

export async function createSoundUploadTicket(
    campaignId: string,
    format: TrackFormat
): Promise<Result<TrackUploadTicket>> {
    const bucket = await soundBucket(createAdminClient());

    if (!bucket.ok) return bucket;

    const { ext, contentType } = TRACK_FORMATS[format];

    const path = `${campaignId}/${crypto.randomUUID().replace(/-/g, '')}.${ext}`;

    const { data, error } = await bucket.value.createSignedUploadUrl(path);

    if (error || !data)
        return { ok: false, message: error?.message ?? API_ERRORS.INTERNAL };

    return {
        ok: true,
        value: {
            bucket: SOUNDBOARD_BUCKET,
            path: data.path,
            token: data.token,
            contentType,
        },
    };
}

export async function verifyUploadedSound(
    path: string
): Promise<Result<string>> {
    const bucket = createAdminClient().storage.from(SOUNDBOARD_BUCKET);

    const { data, error } = await bucket.info(path);

    if (error || !data)
        return { ok: false, message: API_ERRORS.TRACK_UPLOAD_MISSING };

    const type = (data.contentType ?? '').toLowerCase();

    if (
        !TRACK_CONTENT_TYPES.includes(type) ||
        !data.size ||
        data.size > Math.min(MAX_SOUND_BYTES, MAX_TRACK_BYTES)
    ) {
        await bucket.remove([path]);

        return { ok: false, message: API_ERRORS.SOUND_FILE_INVALID };
    }

    return { ok: true, value: bucket.getPublicUrl(path).data.publicUrl };
}

export const soundObjectPath = (url: string): string | null =>
    bucketObjectPath(url, SOUNDBOARD_BUCKET);

export async function removeSoundObject(path: string): Promise<void> {
    try {
        const { error } = await createAdminClient()
            .storage.from(SOUNDBOARD_BUCKET)
            .remove([path]);

        if (error)
            console.warn('[soundboard] remove failed', path, error.message);
    } catch (e) {
        console.warn('[soundboard] remove failed', path, e);
    }
}
