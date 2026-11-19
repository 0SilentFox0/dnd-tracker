'use client';

import { soundKeys } from './keys';

import {
    createLibrarySound,
    deleteLibrarySound,
    discardSoundObject,
    importSoundLink,
    updateLibrarySound,
    uploadLibrarySoundFile,
} from '@/lib/api/sound-library';
import { useCrudMutation } from '@/lib/hooks/common';
import type {
    CreateLibrarySoundData,
    UpdateLibrarySoundData,
} from '@/types/soundboard';

export function useLibraryMutations() {
    const invalidateKeys = [soundKeys.library()];

    const upload = useCrudMutation({
        mutationFn: ({
            file,
            ...meta
        }: {
            file: File | Blob;
            name?: string;
            durationMs: number;
            source?: 'upload' | 'record';
        }) => uploadLibrarySoundFile(file, meta),
        invalidateKeys,
    });

    const create = useCrudMutation({
        mutationFn: (data: CreateLibrarySoundData) => createLibrarySound(data),
        invalidateKeys,
    });

    const update = useCrudMutation({
        mutationFn: ({
            id,
            patch,
        }: {
            id: string;
            patch: UpdateLibrarySoundData;
        }) => updateLibrarySound(id, patch),
        invalidateKeys,
    });

    const remove = useCrudMutation({
        mutationFn: (id: string) => deleteLibrarySound(id),
        invalidateKeys,
    });

    const importLink = useCrudMutation({
        mutationFn: (url: string) => importSoundLink(url),
    });

    const discard = useCrudMutation({
        mutationFn: (path: string) => discardSoundObject(path),
    });

    return { upload, create, update, remove, importLink, discard };
}
