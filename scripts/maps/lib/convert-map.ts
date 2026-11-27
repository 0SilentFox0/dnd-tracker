import { Prisma } from '@prisma/client';

import '@/lib/utils/rules/systems/registry';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { mapArtSceneSchema } from '@/lib/schemas/map-art';
import { storedRecord } from '@/lib/schemas/stored-json';
import { assembleGeometry } from '@/lib/server/battle-maps/assemble';
import { deriveMechanics } from '@/lib/utils/battle/map-art/derive';
import { stampCells } from '@/lib/utils/battle/map-art/stamp-cells';
import { chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import type { EdgeChunks } from '@/lib/utils/battle/map-storage/edge-chunks';
import { isRecord } from '@/lib/utils/common/is-record';
import { toInputJsonObject } from '@/lib/utils/common/json';
import {
    countObjectCells,
    type ObjectsConversion,
    objectsToStamps,
} from '@/scripts/maps/lib/objects-to-stamps';
import {
    type ChunkTileLayers,
    convertTiles,
    countDroppedLayers,
    type DroppedLayers,
    hasFloorLayers,
    stripArtLayers,
} from '@/scripts/maps/lib/tiles-to-scene';
import type { BattleMapFull, MapArtScene, MapArtStamp } from '@/types/battle-map';

export interface ChunkRow {
    cx: number;
    cy: number;
    data: string;
    tileLayers: unknown;
}

export interface ObjectsReport extends ObjectsConversion {
    total: number;
    newBlocked: number;
}

export interface Conversion {
    scene: MapArtScene;
    wallsClipped: number;
    dropped: DroppedLayers;
    objects: ObjectsReport;
    header: Record<string, unknown>;
}

const sortedUnion = (a: readonly string[] | undefined, b: Iterable<string>) =>
    [...new Set([...(a ?? []), ...b])].sort((x, y) => x.localeCompare(y));

function tileLayersOf(chunks: ChunkRow[]): ChunkTileLayers {
    const tileLayers = tileLayersOf(chunks);

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

    const { report, header: nextHeader } = objectsReport(tileLayers, header, []);

    const scene = { ...converted.scene, stamps: report.stamps };

    if (!mapArtSceneSchema.safeParse(scene).success)
        throw new Error('scene failed mapArtSceneSchema');

    return {
        scene,
        wallsClipped: converted.wallsClipped,
        dropped: countDroppedLayers(tileLayers),
        objects: report,
        header: nextHeader,
    };
}

export interface ObjectsAddition {
    scene: MapArtScene;
    objects: ObjectsReport;
    header: Record<string, unknown>;
}

/** Null when the map has no objects layer; throws when the result would not fit the limits. */
export function buildObjectsConversion(
    existingScene: MapArtScene,
    headerJson: unknown,
    chunks: ChunkRow[]
): ObjectsAddition | null {
    const tileLayers = tileLayersOf(chunks);

    if (countObjectCells(tileLayers) === 0) return null;

    const header = storedRecord<BattleMapFull['map']>().parse(headerJson);

    const { report, header: nextHeader } = objectsReport(
        tileLayers,
        header,
        existingScene.stamps
    );

    const scene = {
        ...existingScene,
        stamps: [...existingScene.stamps, ...report.stamps],
    };

    if (!mapArtSceneSchema.safeParse(scene).success)
        throw new Error('scene failed mapArtSceneSchema');

    if (deriveMechanics(scene, header).blocked.length > MAP_LIMITS.maxTerrainCells)
        throw new Error('too many blocked cells');

    return { scene, objects: report, header: nextHeader };
}

function stripSnapshotLayers(
    payload: Record<string, unknown>,
    header: Record<string, unknown>
) {
    const layers = isRecord(payload.tileLayers) ? payload.tileLayers : {};

    const tileLayers: Record<string, Record<string, string>> = {};

    for (const [key, value] of Object.entries(layers)) {
        const rest = isRecord(value)
            ? stripArtLayers(value as Record<string, string>)
            : null;

        if (rest) tileLayers[key] = rest;
    }

    return { ...payload, header, tileLayers };
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

    await writeConversion(tx, {
        mapId,
        base,
        chunks,
        header: conversion.header,
        writeArt: () =>
            tx.battleMapArt.create({
                data: {
                    mapId,
                    scene: toInputJsonObject(conversion.scene),
                    sceneVersion: 1,
                },
            }),
    });

    return conversion;
}

/** Appends tile objects to an existing art scene; baked maps are skipped unless includeBaked. */
export async function applyObjectsTx(
    tx: Prisma.TransactionClient,
    mapId: string,
    options: { includeBaked?: boolean } = {}
): Promise<ObjectsAddition | null> {
    const art = await tx.battleMapArt.findUnique({ where: { mapId } });

    if (!art || (art.bakedSceneVersion !== null && !options.includeBaked))
        return null;

    const map = await tx.battleMap.findUniqueOrThrow({
        where: { id: mapId },
        select: { header: true, mapVersion: true },
    });

    const chunks = await tx.battleMapChunk.findMany({
        where: { mapId },
        select: { cx: true, cy: true, data: true, tileLayers: true },
    });

    const addition = buildObjectsConversion(
        mapArtSceneSchema.parse(art.scene),
        map.header,
        chunks
    );

    if (!addition) return null;

    await writeConversion(tx, {
        mapId,
        base: map.mapVersion,
        chunks,
        header: addition.header,
        writeArt: () =>
            tx.battleMapArt.update({
                where: { mapId },
                data: {
                    scene: toInputJsonObject(addition.scene),
                    sceneVersion: { increment: 1 },
                    updatedAt: new Date(),
                },
            }),
    });

    return addition;
}

async function writeConversion(
    tx: Prisma.TransactionClient,
    input: {
        mapId: string;
        base: number;
        chunks: ChunkRow[];
        header: Record<string, unknown>;
        writeArt: () => Promise<unknown>;
    }
): Promise<void> {
    const { mapId, base, chunks, header } = input;

    const { count } = await tx.battleMap.updateMany({
        where: { id: mapId, mapVersion: base },
        data: { mapVersion: { increment: 1 }, header: toInputJsonObject(header) },
    });

    if (count === 0) throw new Error('map changed during conversion');

    await input.writeArt();

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
        : { header };

    await tx.battleMapVersion.create({
        data: {
            mapId,
            version: base + 1,
            payload: stripSnapshotLayers(payload, header) as Prisma.InputJsonObject,
        },
    });

    const { pruneMapVersions } = await import(
        '@/lib/server/battle-maps/library-service'
    );

    await pruneMapVersions(tx, mapId, base + 1);
}
