import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    TRACK_CONTENT_TYPES,
    TRACK_EXTENSIONS,
    TRACK_FORMATS,
    type TrackFormat,
} from '@/lib/constants/music';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureBucket } from '@/lib/supabase/buckets';
import type { TrackUploadTicket } from '@/types/audio';
import type { Result } from '@/types/common';

type Admin = ReturnType<typeof createAdminClient>;
type Bucket = ReturnType<Admin['storage']['from']>;

export type AudioBucket = { name: string; maxBytes: number };

const AUDIO_OBJECT = new RegExp(
    `^([^/]+)/[a-f0-9]{32}\\.(${TRACK_EXTENSIONS.join('|')})$`
);

export const audioPathOwnedBy = (path: string, campaignId: string): boolean =>
    AUDIO_OBJECT.exec(path)?.[1] === campaignId;

async function audioBucket(
    supabase: Admin,
    { name, maxBytes }: AudioBucket
): Promise<Result<Bucket>> {
    // limit and types at bucket level: Storage rejects a foreign file sent through a signed URL
    const ensured = await ensureBucket(supabase, name, {
        public: true,
        fileSizeLimit: maxBytes,
        allowedMimeTypes: TRACK_CONTENT_TYPES,
    });

    return ensured.ok
        ? { ok: true, value: supabase.storage.from(name) }
        : ensured;
}

export async function createAudioUploadTicket(
    bucketConfig: AudioBucket,
    campaignId: string,
    format: TrackFormat
): Promise<Result<TrackUploadTicket>> {
    const bucket = await audioBucket(createAdminClient(), bucketConfig);

    if (!bucket.ok) return bucket;

    const { ext, contentType } = TRACK_FORMATS[format];

    const path = `${campaignId}/${crypto.randomUUID().replace(/-/g, '')}.${ext}`;

    const { data, error } = await bucket.value.createSignedUploadUrl(path);

    if (error || !data)
        return { ok: false, message: error?.message ?? API_ERRORS.INTERNAL };

    return {
        ok: true,
        value: {
            bucket: bucketConfig.name,
            path: data.path,
            token: data.token,
            contentType,
        },
    };
}

export async function verifyUploadedAudio(
    { name, maxBytes }: AudioBucket,
    path: string,
    invalidMessage: string
): Promise<Result<string>> {
    const bucket = createAdminClient().storage.from(name);

    const { data, error } = await bucket.info(path);

    if (error || !data)
        return { ok: false, message: API_ERRORS.TRACK_UPLOAD_MISSING };

    const type = (data.contentType ?? '').toLowerCase();

    if (
        !TRACK_CONTENT_TYPES.includes(type) ||
        !data.size ||
        data.size > maxBytes
    ) {
        await bucket.remove([path]);

        return { ok: false, message: invalidMessage };
    }

    return { ok: true, value: bucket.getPublicUrl(path).data.publicUrl };
}
