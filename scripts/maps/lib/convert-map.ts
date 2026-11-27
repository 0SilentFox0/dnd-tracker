import { Prisma } from '@prisma/client';

import '@/lib/utils/rules/systems/registry';
import { mapArtSceneSchema } from '@/lib/schemas/map-art';
import { storedRecord } from '@/lib/schemas/stored-json';
import { assembleGeometry } from '@/lib/server/battle-maps/assemble';
import { chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import type { EdgeChunks } from '@/lib/utils/battle/map-storage/edge-chunks';
import { isRecord } from '@/lib/utils/common/is-record';
import { toInputJsonObject } from '@/lib/utils/common/json';
import {
    type ChunkTileLayers,
    convertTiles,
    hasFloorLayers,
    stripArtLayers,
} from '@/scripts/maps/lib/tiles-to-scene';
import type { BattleMapFull, MapArtScene } from '@/types/battle-map';

export interface ChunkRow {
    cx: number;
    cy: number;
    data: string;
    tileLayers: unknown;
}

export interface Conversion {
    scene: MapArtScene;
    wallsClipped: number;
}

/** Null when the map has no ground/wallfill to convert. */
export function buildConversion(
    headerJson: unknown,
    chunks: ChunkRow[]
): Conversion | null {
    const tileLayers: ChunkTileLayers = {};

    for (const c of chunks)
        if (isRecord(c.tileLayers))
            tileLayers[chunkKey(c.cx, c.cy)] = c.tileLayers;

    if (!hasFloorLayers(tileLayers)) return null;

    const header = storedRecord<BattleMapFull['map']>().parse(headerJson);

    const edges: EdgeChunks = Object.fromEntries(
        chunks.map((c) => [chunkKey(c.cx, c.cy), c.data])
    );

    const geometry = assembleGeometry(header, edges);

    const converted = convertTiles(tileLayers, {
        ...geometry.map,
        walls: geometry.walls,
        bars: geometry.bars,
    });

    if (!mapArtSceneSchema.safeParse(converted.scene).success)
        throw new Error('scene failed mapArtSceneSchema');

    return converted;
}

function stripSnapshotLayers(payload: Record<string, unknown>) {
    const layers = isRecord(payload.tileLayers) ? payload.tileLayers : {};

    const tileLayers: Record<string, Record<string, string>> = {};

    for (const [key, value] of Object.entries(layers)) {
        const rest = isRecord(value)
            ? stripArtLayers(value as Record<string, string>)
            : null;

        if (rest) tileLayers[key] = rest;
    }

    return { ...payload, tileLayers };
}

/** Everything is read inside the transaction; mapVersion is bumped with a stripped snapshot. */
export async function applyConversionTx(
    tx: Prisma.TransactionClient,
    mapId: string
): Promise<Conversion | null> {
    if (await tx.battleMapArt.findUnique({ where: { mapId } })) return null;

    const map = await tx.battleMap.findUniqueOrThrow({
        where: { id: mapId },
        select: { header: true, mapVersion: true },
    });

    const chunks = await tx.battleMapChunk.findMany({
        where: { mapId },
        select: { cx: true, cy: true, data: true, tileLayers: true },
    });

    const conversion = buildConversion(map.header, chunks);

    if (!conversion) return null;

    const base = map.mapVersion;

    const { count } = await tx.battleMap.updateMany({
        where: { id: mapId, mapVersion: base },
        data: { mapVersion: { increment: 1 } },
    });

    if (count === 0) throw new Error('map changed during conversion');

    await tx.battleMapArt.create({
        data: {
            mapId,
            scene: toInputJsonObject(conversion.scene),
            sceneVersion: 1,
        },
    });

    for (const c of chunks) {
        if (!isRecord(c.tileLayers)) continue;

        const rest = stripArtLayers(c.tileLayers as Record<string, string>);

        await tx.battleMapChunk.update({
            where: { mapId_cx_cy: { mapId, cx: c.cx, cy: c.cy } },
            data: {
                tileLayers: rest ? toInputJsonObject(rest) : Prisma.DbNull,
            },
        });
    }

    const snapshot = await tx.battleMapVersion.findUnique({
        where: { mapId_version: { mapId, version: base } },
    });

    const payload = snapshot
        ? (JSON.parse(JSON.stringify(snapshot.payload)) as Record<
              string,
              unknown
          >)
        : { header: map.header };

    await tx.battleMapVersion.create({
        data: {
            mapId,
            version: base + 1,
            payload: stripSnapshotLayers(payload) as Prisma.InputJsonObject,
        },
    });

    const { pruneMapVersions } = await import(
        '@/lib/server/battle-maps/library-service'
    );

    await pruneMapVersions(tx, mapId, base + 1);

    return conversion;
}
