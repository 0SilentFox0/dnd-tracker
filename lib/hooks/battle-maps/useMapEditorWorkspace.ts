'use client';

import { useEffect, useState } from 'react';

import type { useMapEditorDraft } from '@/lib/hooks/battle-maps/useMapEditorDraft';
import { useTileEditor } from '@/lib/hooks/battle-maps/useTileEditor';
import { useUnsavedChangesGuard } from '@/lib/hooks/common';
import { chordBlocked } from '@/lib/hooks/common/shortcut-guard';
import type { BattleMapFull, BattleMapTileChunks } from '@/types/battle-map';

export type EditorPanel = 'background' | 'cells' | 'edges' | 'objects';

export function useMapEditorWorkspace(
    source: BattleMapFull,
    draft: ReturnType<typeof useMapEditorDraft>,
    tileData: BattleMapTileChunks
) {
    const { map } = draft.editor.state;

    const tileEditor = useTileEditor({
        initialChunks: tileData.chunks,
        version: tileData.version,
        mapSize: { cols: map.cols, rows: map.rows },
    });

    const hex = draft.editor.state.grid === 'hex';

    const [panel, setPanel] = useState<EditorPanel>(() => {
        if (source.map.background) return 'background';

        return hex ? 'cells' : 'objects';
    });

    const paintingTiles = !hex && panel === 'objects';

    const { undo, redo } = tileEditor;

    const { setTool } = draft.editor.actions;

    useEffect(() => {
        if (!paintingTiles) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.altKey) return;

            if (chordBlocked(event)) return;

            const key = event.key.toLowerCase();

            if (key === 'z') {
                event.preventDefault();

                if (event.shiftKey) redo();
                else undo();
            } else if (key === 'y') {
                event.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [paintingTiles, redo, undo]);

    useUnsavedChangesGuard(draft.isDirty || tileEditor.isDirty);

    const selectPanel = (next: EditorPanel) => {
        if (hex && next === 'objects') return;

        if (panel !== next) setTool(null);

        setPanel(next);
    };

    return {
        tileEditor,
        panel,
        selectPanel,
        paintingTiles,
    };
}
