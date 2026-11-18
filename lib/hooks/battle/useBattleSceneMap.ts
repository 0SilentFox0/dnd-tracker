import { useCallback, useMemo, useState } from 'react';

import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import { useBattleMapEdges, useBattleMapTiles } from '@/lib/hooks/battle-maps';
import {
    composeEffectiveMap,
    type LibraryEdges,
} from '@/lib/utils/battle/map-storage/effective-map';
import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';
import { deriveTileCells } from '@/lib/utils/battle/tiles/derive';
import { decodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import type { TileLayer } from '@/lib/utils/battle/tiles/types';
import type { BattleScene } from '@/types/api';

const TILE_PROPERTIES = Object.fromEntries(
    TILE_CATALOG.map((tile) => [tile.id, {
        blocks: tile.blocks,
        blocksSight: tile.blocksSight,
        footprint: tile.footprint,
    }])
);

function decodeTileLayers(
    encoded: Partial<Record<TileLayer, Record<string, string>>> | undefined
): TileLayerChunks {
    if (!encoded) return {};

    return Object.fromEntries(
        Object.entries(encoded).map(([layer, chunks]) => [
            layer,
            Object.fromEntries(
                Object.entries(chunks ?? {}).map(([key, data]) => [
                    key,
                    decodeTileChunk(data),
                ])
            ),
        ])
    ) as TileLayerChunks;
}

export function useBattleSceneMap(
    campaignId: string,
    rawBattle: BattleScene | undefined
) {
    const mapEdges = useBattleMapEdges(campaignId, rawBattle?.mapRef);

    const mapTiles = useBattleMapTiles(
        campaignId,
        rawBattle?.mapRef?.mapId,
        rawBattle?.mapRef?.version,
        !!rawBattle?.mapRef
    );

    const [heldEdges, setHeldEdges] = useState<LibraryEdges | undefined>();

    if (mapEdges.data && mapEdges.data !== heldEdges)
        setHeldEdges(mapEdges.data);

    const edges =
        mapEdges.data ??
        (rawBattle?.mapRef && mapEdges.isPending ? heldEdges : undefined);

    const tileChunks = useMemo(
        () => decodeTileLayers(mapTiles.data?.chunks),
        [mapTiles.data]
    );

    const decodedTileFields = useMemo(() => {
        if (!rawBattle?.map || !mapTiles.data) return null;

        return deriveTileCells(
            {
                chunks: tileChunks,
                cols: rawBattle.map.cols,
                rows: rawBattle.map.rows,
                version: mapTiles.data.version,
            },
            TILE_PROPERTIES
        );
    }, [mapTiles.data, rawBattle, tileChunks]);

    const isMapPending =
        !!rawBattle?.mapRef &&
        (!edges || (mapTiles.isPending && !mapTiles.isError));

    const mapError = isMapPending ? mapEdges.error : null;

    const { refetch: refetchEdges } = mapEdges;

    const retry = useCallback(() => void refetchEdges(), [refetchEdges]);

    const battle = useMemo(() => {
        if (!rawBattle?.map || isMapPending) return rawBattle;

        const effective = composeEffectiveMap(
            rawBattle.map,
            rawBattle.mapState,
            edges
        );

        const blocked = decodedTileFields?.blocked;

        const map = blocked?.size
            ? {
                  ...effective,
                  blocked: [...new Set([...(effective.blocked ?? []), ...blocked])],
              }
            : effective;

        return map === rawBattle.map ? rawBattle : { ...rawBattle, map };
    }, [rawBattle, edges, isMapPending, decodedTileFields]);

    return {
        battle,
        isMapPending,
        loading: isMapPending && !mapEdges.isError,
        error: mapError,
        retry,
        tiles: mapTiles.data
            ? { chunks: tileChunks, version: mapTiles.data.version }
            : null,
    };
}
