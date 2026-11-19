import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_TRACK_BYTES } from '@/lib/constants/music';
import {
    MAX_SOUND_BYTES,
    SOUND_FORMATS,
    SOUNDBOARD_BUCKET,
    type SoundFormat,
} from '@/lib/constants/soundboard';
import { createAdminClient } from '@/lib/supabase/admin';
import {
    type AudioBucket,
    audioPathOwnedBy,
    createAudioUploadTicket,
    verifyUploadedAudio,
} from '@/lib/supabase/audio-upload';
import { bucketObjectPath } from '@/lib/utils/common/image-url';
import type { TrackUploadTicket } from '@/types/audio';
import type { Result } from '@/types/common';

const BUCKET: AudioBucket = {
    name: SOUNDBOARD_BUCKET,
    maxBytes: Math.min(MAX_SOUND_BYTES, MAX_TRACK_BYTES),
    formats: SOUND_FORMATS,
};

export const soundPathOwnedBy = (path: string, userId: string): boolean =>
    audioPathOwnedBy(path, userId, SOUND_FORMATS);

export const createSoundUploadTicket = (
    userId: string,
    format: SoundFormat
): Promise<Result<TrackUploadTicket>> =>
    createAudioUploadTicket(BUCKET, userId, format);

export const verifyUploadedSound = (path: string): Promise<Result<string>> =>
    verifyUploadedAudio(BUCKET, path, API_ERRORS.SOUND_FILE_INVALID);

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
