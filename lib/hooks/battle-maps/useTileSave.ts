'use client';

import { usePatchBattleMapTiles } from './useBattleMaps';
import type { useMapEditorDraft } from './useMapEditorDraft';
import type { useTileEditor } from './useTileEditor';

export function useTileSave(
    campaignId: string,
    mapId: string,
    tileEditor: ReturnType<typeof useTileEditor>,
    draft: ReturnType<typeof useMapEditorDraft>
) {
    const mutation = usePatchBattleMapTiles(campaignId, mapId);

    const { version, dirtyPatches, acceptSaved } = tileEditor;

    const { acceptVersion } = draft;

    const save = () =>
        mutation.mutate(
            { expectedVersion: version, patches: dirtyPatches },
            {
                onSuccess: (saved) => {
                    acceptSaved();
                    acceptVersion(saved.version);
                },
            }
        );

    return {
        save,
        isPending: mutation.isPending,
        isError: mutation.isError,
    };
}
