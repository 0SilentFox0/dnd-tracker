'use client';

import { soundKeys } from './keys';

import {
    deleteSound,
    reorderSounds,
    setHiddenBuiltin,
    updateSound,
    uploadSoundFile,
} from '@/lib/api/soundboard';
import { useCrudMutation } from '@/lib/hooks/common';
import type { UpdateSoundData } from '@/types/soundboard';

export function useSoundMutations(campaignId: string) {
    const invalidateKeys = [soundKeys.list(campaignId)];

    const upload = useCrudMutation({
        mutationFn: ({
            file,
            name,
            durationMs,
        }: {
            file: File;
            name: string;
            durationMs: number;
        }) => uploadSoundFile(campaignId, file, { name, durationMs }),
        invalidateKeys,
    });

    const update = useCrudMutation({
        mutationFn: ({ id, patch }: { id: string; patch: UpdateSoundData }) =>
            updateSound(campaignId, id, patch),
        invalidateKeys,
    });

    const remove = useCrudMutation({
        mutationFn: (id: string) => deleteSound(campaignId, id),
        invalidateKeys,
    });

    const reorder = useCrudMutation({
        mutationFn: (ids: string[]) => reorderSounds(campaignId, ids),
        invalidateKeys,
    });

    const hide = useCrudMutation({
        mutationFn: (ids: string[]) => setHiddenBuiltin(campaignId, ids),
        invalidateKeys,
    });

    return { upload, update, remove, reorder, hide };
}
