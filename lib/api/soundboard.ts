import {
    campaignDelete,
    campaignGet,
    campaignPatch,
    campaignPost,
    campaignPut,
} from './client';
import { uploadAudioViaTicket } from './upload-audio-file';

import { validateSoundFile } from '@/lib/utils/soundboard/validate-file';
import type { TrackUploadTicket } from '@/types/audio';
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

export async function uploadSoundFile(
    campaignId: string,
    file: File,
    meta: { name: string; durationMs: number }
): Promise<Sound> {
    const checked = validateSoundFile(file);

    if (!checked.ok) throw new Error(checked.message);

    const ticket = await uploadAudioViaTicket(
        (req) =>
            campaignPost<TrackUploadTicket>(
                campaignId,
                '/sounds/upload-url',
                req
            ),
        file,
        checked.value,
        'soundboard.uploadFailed'
    );

    return createSound(campaignId, {
        path: ticket.path,
        name: meta.name,
        durationMs: Math.max(1, Math.round(meta.durationMs)),
    });
}
