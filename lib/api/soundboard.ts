import {
    campaignDelete,
    campaignGet,
    campaignPatch,
    campaignPost,
    campaignPut,
} from './client';

import { TRACK_CACHE_SECONDS, TRACK_FORMATS } from '@/lib/constants/music';
import { createClient } from '@/lib/supabase/client';
import { validateSoundFile } from '@/lib/utils/soundboard/validate-file';
import type { TrackUploadRequest, TrackUploadTicket } from '@/types/audio';
import type {
    CreateSoundData,
    Sound,
    SoundList,
    UpdateSoundData,
} from '@/types/soundboard';

export const getSounds = (campaignId: string) =>
    campaignGet<SoundList>(campaignId, '/sounds');

export const createSound = (campaignId: string, data: CreateSoundData) =>
    campaignPost<Sound>(campaignId, '/sounds', data);

export const updateSound = (
    campaignId: string,
    soundId: string,
    data: UpdateSoundData
) => campaignPatch<Sound>(campaignId, `/sounds/${soundId}`, data);

export const deleteSound = (campaignId: string, soundId: string) =>
    campaignDelete<{ ok: true }>(campaignId, `/sounds/${soundId}`);

export const reorderSounds = (campaignId: string, ids: string[]) =>
    campaignPut<{ ok: true }>(campaignId, '/sounds/order', { ids });

export const setHiddenBuiltin = (campaignId: string, ids: string[]) =>
    campaignPut<{ ok: true }>(campaignId, '/sounds/hidden', { ids });

export const playSound = (
    campaignId: string,
    data: { soundId: string; nonce: string }
) => campaignPost<{ ok: true }>(campaignId, '/sounds/play', data);

/** The file goes from the browser straight to Storage: the request body to Vercel is capped at 4.5 MB. */
export async function uploadSoundFile(
    campaignId: string,
    file: File,
    meta: { name: string; durationMs: number }
): Promise<Sound> {
    const checked = validateSoundFile(file);

    if (!checked.ok) throw new Error(checked.message);

    const request: TrackUploadRequest = {
        name: file.name,
        size: file.size,
        contentType: TRACK_FORMATS[checked.value].contentType,
    };

    const ticket = await campaignPost<TrackUploadTicket>(
        campaignId,
        '/sounds/upload-url',
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
        console.warn('[sounds] upload failed', error.message);

        throw new Error('soundboard.uploadFailed');
    }

    return createSound(campaignId, {
        path: ticket.path,
        name: meta.name,
        durationMs: Math.max(1, Math.round(meta.durationMs)),
    });
}
