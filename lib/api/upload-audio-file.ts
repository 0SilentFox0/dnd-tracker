import {
    TRACK_CACHE_SECONDS,
    type TrackFormat,
} from '@/lib/constants/music';
import { SOUND_FORMATS, type SoundFormat } from '@/lib/constants/soundboard';
import { createClient } from '@/lib/supabase/client';
import type { TrackUploadRequest, TrackUploadTicket } from '@/types/audio';

/** The file goes from the browser straight to Storage: the request body to Vercel is capped at 4.5 MB. */
export async function uploadAudioViaTicket(
    requestTicket: (req: TrackUploadRequest) => Promise<TrackUploadTicket>,
    file: File | Blob,
    format: TrackFormat | SoundFormat,
    failureKey: string
): Promise<TrackUploadTicket> {
    const ticket = await requestTicket({
        name: file instanceof File ? file.name : `recording.${format}`,
        size: file.size,
        contentType: SOUND_FORMATS[format].contentType,
    });

    // browsers send "audio/x-m4a" or "" for .m4a: retype from the ticket
    const body = new Blob([file], { type: ticket.contentType });

    const { error } = await createClient()
        .storage.from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, body, {
            contentType: ticket.contentType,
            cacheControl: TRACK_CACHE_SECONDS,
        });

    if (error) {
        console.warn('[upload] failed', error.message);

        throw new Error(failureKey);
    }

    return ticket;
}
