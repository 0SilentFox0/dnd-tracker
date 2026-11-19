'use client';

import { soundKeys } from './keys';

import {
    createPreset,
    deletePreset,
    reorderPresets,
    updatePreset,
} from '@/lib/api/sound-library';
import { useCrudMutation } from '@/lib/hooks/common';

export function usePresetMutations() {
    const invalidateKeys = [soundKeys.library()];

    const create = useCrudMutation({
        mutationFn: (name: string) => createPreset(name),
        invalidateKeys,
    });

    const update = useCrudMutation({
        mutationFn: ({
            id,
            patch,
        }: {
            id: string;
            patch: { name?: string; slots?: (string | null)[] };
        }) => updatePreset(id, patch),
        invalidateKeys,
    });

    const remove = useCrudMutation({
        mutationFn: (id: string) => deletePreset(id),
        invalidateKeys,
    });

    const reorder = useCrudMutation({
        mutationFn: (ids: string[]) => reorderPresets(ids),
        invalidateKeys,
    });

    return { create, update, remove, reorder };
}
