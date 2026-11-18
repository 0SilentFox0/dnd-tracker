'use client';

import { useMemo, useState } from 'react';

import type { BattleMapScene } from './useBattleMapScene';
import { useFogMemory } from './useFogMemory';

import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import { fogView } from '@/lib/utils/battle/fog/fog-view';
import { deriveTileCells } from '@/lib/utils/battle/tiles/derive';

const TILE_CATALOG_CELLS = Object.fromEntries(
    TILE_CATALOG.map((tile) => [
        tile.id,
        {
            blocks: tile.blocks,
            blocksSight: tile.blocksSight,
            footprint: tile.footprint,
        },
    ])
);

const DEFAULT_VISION_RADIUS = 8;

export function useBattleMapFog(scene: BattleMapScene) {
    const { map, participants, battle, viewer, fogTool, tileChunks } = scene;

    const [viewAsParticipantId, setViewAsParticipantId] = useState('');

    const [shareVision, setShareVision] = useState(false);

    const fogState = battle.mapState?.fog;

    const fogMode = map.maze ? 'off' : (fogState?.mode ?? 'off');

    const viewAsParticipant = participants.find(
        (participant) => participant.basicInfo.id === viewAsParticipantId
    );

    const viewAsUserId = viewAsParticipant?.basicInfo.controlledBy ?? viewer.userId;

    const isPlayerPreview = viewer.isDM && !!viewAsParticipant;

    const dmEditing = viewer.isDM && !isPlayerPreview;

    const { cols, rows } = map;

    const tileVersion = scene.tileVersion ?? 0;

    const tileBlocksSight = useMemo(
        () =>
            tileChunks
                ? deriveTileCells(
                      { chunks: tileChunks, cols, rows, version: tileVersion },
                      TILE_CATALOG_CELLS
                  ).blocksSight
                : undefined,
        [tileChunks, cols, rows, tileVersion]
    );

    const view = useMemo(
        () =>
            fogView({
                map,
                participants,
                mode: fogMode,
                viewerId: viewAsUserId,
                isDM: dmEditing,
                revealed: fogState?.revealed ?? [],
                radius: fogState?.visionRadius ?? DEFAULT_VISION_RADIUS,
                tileBlocksSight,
                shareAllies: shareVision,
            }),
        [map, participants, fogMode, viewAsUserId, dmEditing, fogState, tileBlocksSight, shareVision]
    );

    const remembers =
        fogMode === 'vision' && (!viewer.isDM || isPlayerPreview);

    const memory = useFogMemory({
        battleId: battle.id,
        viewerId: isPlayerPreview
            ? `dm-preview:${viewAsUserId}`
            : (viewAsUserId ?? 'anonymous'),
        size: { cols, rows },
        visible: view.visible,
        enabled: remembers,
    });

    const explored = useMemo(() => {
        if (fogMode !== 'vision') return view.visible;

        const all = new Set(memory.explored);

        for (const cell of view.visible) all.add(cell);

        return all;
    }, [fogMode, memory.explored, view.visible]);

    const visibleParticipants = useMemo(
        () =>
            participants.filter((participant) =>
                view.visibleIds.has(participant.basicInfo.id)
            ),
        [participants, view.visibleIds]
    );

    const editing = useMemo(
        () => ({
            mode: fogMode,
            revealed: fogState?.revealed ?? [],
            visible: view.visible,
            explored,
            dmEditing,
            active: fogTool?.active ?? false,
            brush: fogTool?.brush ?? ('brush' as const),
            onStroke: fogTool?.applyCells ?? (() => undefined),
        }),
        [fogMode, fogState, view.visible, explored, dmEditing, fogTool]
    );

    return {
        mode: fogMode,
        visibleParticipants,
        editing,
        preview: {
            participantId: viewAsParticipantId,
            setParticipantId: setViewAsParticipantId,
            isPlayer: isPlayerPreview,
        },
        share: { on: shareVision, set: setShareVision },
        memory: { remember: memory.remember, set: memory.setRemember },
        showRemember: remembers,
    };
}
