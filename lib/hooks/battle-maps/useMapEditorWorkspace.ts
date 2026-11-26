'use client';

import { useEffect, useState } from 'react';

import type { useMapArtEditor } from '@/lib/hooks/battle-maps/useMapArtEditor';
import type { useMapEditorDraft } from '@/lib/hooks/battle-maps/useMapEditorDraft';
import { useTileEditor } from '@/lib/hooks/battle-maps/useTileEditor';
import { useUnsavedChangesGuard } from '@/lib/hooks/common';
import { chordBlocked } from '@/lib/hooks/common/shortcut-guard';
import type { BattleMapFull, BattleMapTileChunks } from '@/types/battle-map';

export type EditorPanel = 'background' | 'cells' | 'edges' | 'art' | 'objects';

type ArtHistory = Pick<
    ReturnType<typeof useMapArtEditor>,
    'active' | 'isDirty' | 'undo' | 'redo' | 'setTool'
>;

export function useMapEditorWorkspace(
    source: BattleMapFull,
    draft: ReturnType<typeof useMapEditorDraft>,
    tileData: BattleMapTileChunks,
    art: ArtHistory
) {
    const { map } = draft.editor.state;

    const tileEditor = useTileEditor({
        initialChunks: tileData.chunks,
        version: tileData.version,
        mapSize: { cols: map.cols, rows: map.rows },
    });

    const hex = draft.editor.state.grid === 'hex';

    const [panel, setPanel] = useState<EditorPanel>(() => {
        if (art.active || !source.map.background) return 'art';

        return 'background';
    });

    const paintingTiles = !hex && panel === 'objects';

    const paintingArt = panel === 'art' && art.active;

    const history = paintingTiles ? tileEditor : art;

    const { undo, redo } = history;

    const { setTool } = draft.editor.actions;

    const { setTool: setArtTool } = art;

    useEffect(() => {
        if (!paintingTiles && !paintingArt) return;

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
    }, [paintingTiles, paintingArt, redo, undo]);

    useUnsavedChangesGuard(draft.isDirty || tileEditor.isDirty || art.isDirty);

    const selectPanel = (next: EditorPanel) => {
        if (hex && next === 'objects') return;

        if (panel !== next) {
            setTool(null);
            setArtTool(null);
        }

        setPanel(next);
    };

    return {
        tileEditor,
        panel,
        selectPanel,
        paintingTiles,
        paintingArt,
    };
}
