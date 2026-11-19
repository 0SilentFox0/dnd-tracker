import { request } from './client';
import { uploadAudioViaTicket } from './upload-audio-file';

import { validateSoundFile } from '@/lib/utils/soundboard/validate-file';
import type { TrackUploadTicket } from '@/types/audio';
import type {
    CreateLibrarySoundData,
    LibrarySoundRow,
    SoundLibrary,
    SoundPreset,
    UpdateLibrarySoundData,
} from '@/types/soundboard';

const json = (method: string, body?: unknown): RequestInit => ({
    method,
    ...(body !== undefined && { body: JSON.stringify(body) }),
});

export const getSoundLibrary = () =>
    request<SoundLibrary>('/api/sound-library');

export const createLibrarySound = (data: CreateLibrarySoundData) =>
    request<LibrarySoundRow>('/api/sound-library', json('POST', data));

export const updateLibrarySound = (id: string, data: UpdateLibrarySoundData) =>
    request<LibrarySoundRow>(`/api/sound-library/${id}`, json('PATCH', data));

export const deleteLibrarySound = (id: string) =>
    request<{ ok: true }>(`/api/sound-library/${id}`, json('DELETE'));

export const importSoundLink = (url: string) =>
    request<{ path: string; url: string }>(
        '/api/sound-library/import',
        json('POST', { url })
    );

export const discardSoundObject = (path: string) =>
    request<{ ok: true }>('/api/sound-library/discard', json('POST', { path }));

export async function uploadLibrarySoundFile(
    file: File | Blob,
    meta: {
        name?: string;
        icon?: string;
        durationMs: number;
        source?: 'upload' | 'record';
    }
): Promise<LibrarySoundRow> {
    const checked = validateSoundFile({
        name: file instanceof File ? file.name : 'recording.webm',
        type: file.type,
        size: file.size,
    });

    if (!checked.ok) throw new Error(checked.message);

    const ticket = await uploadAudioViaTicket(
        (req) =>
            request<TrackUploadTicket>(
                '/api/sound-library/upload-url',
                json('POST', req)
            ),
        file,
        checked.value,
        'soundboard.uploadFailed'
    );

    return createLibrarySound({
        path: ticket.path,
        name: meta.name,
        icon: meta.icon,
        durationMs: Math.max(1, Math.round(meta.durationMs)),
        source: meta.source ?? 'upload',
    });
}

export const createPreset = (name: string) =>
    request<SoundPreset>('/api/sound-presets', json('POST', { name }));

export const updatePreset = (
    id: string,
    patch: { name?: string; slots?: (string | null)[] }
) => request<SoundPreset>(`/api/sound-presets/${id}`, json('PATCH', patch));

export const deletePreset = (id: string) =>
    request<{ ok: true }>(`/api/sound-presets/${id}`, json('DELETE'));

export const reorderPresets = (ids: string[]) =>
    request<{ ok: true }>('/api/sound-presets/order', json('PUT', { ids }));
