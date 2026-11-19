import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    BATTLE_MUSIC_BUCKET,
    MAX_TRACK_BYTES,
    type TrackFormat,
} from '@/lib/constants/music';
import { ContentError } from '@/lib/server/content/errors';
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
    name: BATTLE_MUSIC_BUCKET,
    maxBytes: MAX_TRACK_BYTES,
};

export const trackPathOwnedBy = audioPathOwnedBy;

export const createTrackUploadTicket = (
    campaignId: string,
    format: TrackFormat
): Promise<Result<TrackUploadTicket>> =>
    createAudioUploadTicket(BUCKET, campaignId, format);

export const verifyUploadedTrack = (path: string): Promise<Result<string>> =>
    verifyUploadedAudio(BUCKET, path, API_ERRORS.TRACK_FILE_INVALID);

export const trackObjectPath = (url: string): string | null =>
    bucketObjectPath(url, BATTLE_MUSIC_BUCKET);

export async function removeTrackFile(
    url: string,
    options: { strict?: boolean } = {}
): Promise<void> {
    const path = trackObjectPath(url);

    if (!path) return;

    try {
        const { error } = await createAdminClient()
            .storage.from(BATTLE_MUSIC_BUCKET)
            .remove([path]);

        if (error) {
            if (options.strict)
                throw new ContentError(
                    API_ERRORS.TRACK_FILE_DELETE_FAILED,
                    502
                );

            console.warn('[battle-music] remove failed', path, error.message);
        }
    } catch (e) {
        if (options.strict) throw e;

        console.warn('[battle-music] remove failed', path, e);
    }
}
