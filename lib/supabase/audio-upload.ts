import { API_ERRORS } from '@/lib/constants/api-errors';
import { TRACK_CACHE_SECONDS, TRACK_FORMATS } from '@/lib/constants/music';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureBucket } from '@/lib/supabase/buckets';
import type { TrackUploadTicket } from '@/types/audio';
import type { Result } from '@/types/common';

type Admin = ReturnType<typeof createAdminClient>;
type Bucket = ReturnType<Admin['storage']['from']>;

type AudioFormats = Record<string, { ext: string; contentType: string }>;

export type AudioBucket = {
    name: string;
    maxBytes: number;
    formats?: AudioFormats;
};

const formatsOf = (formats?: AudioFormats): AudioFormats =>
    formats ?? TRACK_FORMATS;

const contentTypesOf = (formats?: AudioFormats): string[] =>
    Object.values(formatsOf(formats)).map((f) => f.contentType);

export const audioPathOwnedBy = (
    path: string,
    ownerId: string,
    formats?: AudioFormats
): boolean => {
    const exts = Object.values(formatsOf(formats)).map((f) => f.ext);

    return (
        new RegExp(`^([^/]+)/[a-f0-9]{32}\\.(${exts.join('|')})$`).exec(
            path
        )?.[1] === ownerId
    );
};

async function audioBucket(
    supabase: Admin,
    { name, maxBytes, formats }: AudioBucket
): Promise<Result<Bucket>> {
    // limit and types at bucket level: Storage rejects a foreign file sent through a signed URL
    const ensured = await ensureBucket(supabase, name, {
        public: true,
        fileSizeLimit: maxBytes,
        allowedMimeTypes: contentTypesOf(formats),
    });

    return ensured.ok
        ? { ok: true, value: supabase.storage.from(name) }
        : ensured;
}

const newAudioPath = (ownerId: string, ext: string): string =>
    `${ownerId}/${crypto.randomUUID().replace(/-/g, '')}.${ext}`;

export async function uploadAudioObject(
    bucketConfig: AudioBucket,
    ownerId: string,
    format: string,
    bytes: Uint8Array
): Promise<Result<{ path: string; url: string }>> {
    const spec = formatsOf(bucketConfig.formats)[format];

    if (!spec) return { ok: false, message: API_ERRORS.INTERNAL };

    const bucket = await audioBucket(createAdminClient(), bucketConfig);

    if (!bucket.ok) return bucket;

    const path = newAudioPath(ownerId, spec.ext);

    const { error } = await bucket.value.upload(path, bytes, {
        contentType: spec.contentType,
        cacheControl: TRACK_CACHE_SECONDS,
    });

    if (error) return { ok: false, message: API_ERRORS.INTERNAL };

    return {
        ok: true,
        value: { path, url: bucket.value.getPublicUrl(path).data.publicUrl },
    };
}

export async function createAudioUploadTicket(
    bucketConfig: AudioBucket,
    ownerId: string,
    format: string
): Promise<Result<TrackUploadTicket>> {
    const bucket = await audioBucket(createAdminClient(), bucketConfig);

    if (!bucket.ok) return bucket;

    const spec = formatsOf(bucketConfig.formats)[format];

    if (!spec) return { ok: false, message: API_ERRORS.INTERNAL };

    const { ext, contentType } = spec;

    const path = newAudioPath(ownerId, ext);

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
    { name, maxBytes, formats }: AudioBucket,
    path: string,
    invalidMessage: string
): Promise<Result<string>> {
    const bucket = createAdminClient().storage.from(name);

    const { data, error } = await bucket.info(path);

    if (error || !data)
        return { ok: false, message: API_ERRORS.TRACK_UPLOAD_MISSING };

    const type = (data.contentType ?? '').toLowerCase();

    if (
        !contentTypesOf(formats).includes(type) ||
        !data.size ||
        data.size > maxBytes
    ) {
        await bucket.remove([path]);

        return { ok: false, message: invalidMessage };
    }

    return { ok: true, value: bucket.getPublicUrl(path).data.publicUrl };
}
