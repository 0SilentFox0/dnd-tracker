import { campaignPost } from './client';

import {
    TRACK_CACHE_SECONDS,
    TRACK_FORMATS,
    type TrackFormat,
} from '@/lib/constants/music';
import { createClient } from '@/lib/supabase/client';
import type { TrackUploadRequest, TrackUploadTicket } from '@/types/audio';

/** The file goes from the browser straight to Storage: the request body to Vercel is capped at 4.5 MB. */
export async function uploadAudioViaTicket(
    campaignId: string,
    file: File,
    format: TrackFormat,
    ticketPath: string,
    failureKey: string
): Promise<TrackUploadTicket> {
    const request: TrackUploadRequest = {
        name: file.name,
        size: file.size,
        contentType: TRACK_FORMATS[format].contentType,
    };

    const ticket = await campaignPost<TrackUploadTicket>(
        campaignId,
        ticketPath,
        request
    );

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
