import { campaignPut, createCampaignCrudApi } from './client';
import { uploadAudioViaTicket } from './upload-audio-file';

import { validateTrackFile } from '@/lib/utils/audio/track-file';
import type {
    CampaignTrack,
    CreateTrackData,
    UpdateTrackData,
} from '@/types/audio';

const tracksApi = createCampaignCrudApi<
    CampaignTrack,
    CreateTrackData,
    UpdateTrackData,
    { ok: true }
>('/tracks', { listCache: 'no-store' });

export const getTracks = tracksApi.list;
export const createTrack = tracksApi.create;
export const updateTrack = tracksApi.update;
export const deleteTrack = tracksApi.remove;

export function reorderTracks(
    campaignId: string,
    ids: string[]
): Promise<CampaignTrack[]> {
    return campaignPut<CampaignTrack[]>(campaignId, '/tracks/order', { ids });
}

export async function uploadTrackFile(
    campaignId: string,
    file: File,
    meta: { title: string; durationSec: number | null }
): Promise<CampaignTrack> {
    const checked = validateTrackFile(file);

    if (!checked.ok) throw new Error(checked.message);

    const ticket = await uploadAudioViaTicket(
        campaignId,
        file,
        checked.value,
        '/tracks/upload-url',
        'music.library.uploadFailed'
    );

    return createTrack(campaignId, {
        kind: 'file',
        path: ticket.path,
        title: meta.title,
        ...(meta.durationSec
            ? { durationSec: Math.max(1, Math.round(meta.durationSec)) }
            : {}),
    });
}
