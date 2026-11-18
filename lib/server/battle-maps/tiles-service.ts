import { Prisma } from '@prisma/client';

import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { validateTileIdsForLayer } from '@/lib/constants/tilesets/catalog';
import { prisma } from '@/lib/db';
import { pruneMapVersions } from '@/lib/server/battle-maps/library-service';
import { ContentError } from '@/lib/server/content/errors';
import { chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import {
    planTileChunkWrites,
    tilePatchKeys,
    type ExistingTileChunk,
} from '@/lib/utils/battle/map-storage/tile-chunk-patch';
import { decodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import { isTileLayer, type TileLayer } from '@/lib/utils/battle/tiles/types';

export interface TileChunkPatch {
    layer: TileLayer;
    cx: number;
    cy: number;
    data: string | null;
}

type LayerRecord = Partial<Record<TileLayer, string>>;
type TileSnapshot = Record<string, LayerRecord>;

const conflict = () => new ContentError('errors.battleMapConflict', 409);

function parseSnapshot(value: unknown): TileSnapshot {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    const snapshot: TileSnapshot = {};

    for (const [key, layers] of Object.entries(value)) {
        if (!layers || typeof layers !== 'object' || Array.isArray(layers))
            continue;

        const parsed: LayerRecord = {};

        for (const [layer, data] of Object.entries(layers)) {
            if (isTileLayer(layer) && typeof data === 'string')
                parsed[layer] = data;
        }

        if (Object.keys(parsed).length) snapshot[key] = parsed;
    }

    return snapshot;
}

export function tileLayersToSnapshot(
    rows: readonly { cx: number; cy: number; tileLayers: unknown }[]
): TileSnapshot {
    const snapshot: TileSnapshot = {};

    for (const row of rows) {
        const layers = parseSnapshot({
            [chunkKey(row.cx, row.cy)]: row.tileLayers,
        });

        Object.assign(snapshot, layers);
    }

    return snapshot;
}

export function splitTileSnapshot(value: unknown) {
    const tiles: Partial<Record<TileLayer, Record<string, string>>> = {};

    for (const [key, layers] of Object.entries(parseSnapshot(value)))
        for (const [layer, data] of Object.entries(layers))
            (tiles[layer as TileLayer] ??= {})[key] = data;

    return tiles;
}

export async function getTileChunks(mapId: string, version: number) {
    const snapshot = await prisma.battleMapVersion.findUnique({
        where: { mapId_version: { mapId, version } },
        select: { payload: true },
    });

    if (!snapshot) return null;

    const payload = snapshot.payload as { tileLayers?: unknown };

    return splitTileSnapshot(payload.tileLayers);
}

export const getPinnedTileChunks = getTileChunks;

export async function patchTileChunks(
    mapId: string,
    expectedVersion: number,
    patches: readonly TileChunkPatch[]
): Promise<number> {
    if (patches.length === 0) return expectedVersion;

    if (patches.length > 512) throw new ContentError('errors.invalidBody', 400);

    const seen = new Set<string>();

    for (const patch of patches) {
        if (
            !Number.isInteger(patch.cx) ||
            !Number.isInteger(patch.cy) ||
            patch.cx < 0 ||
            patch.cy < 0
        )
            throw new ContentError('errors.invalidBody', 400);

        if (!isTileLayer(patch.layer))
            throw new ContentError('errors.invalidBody', 400);

        const key = `${patch.layer}:${patch.cx}:${patch.cy}`;

        if (seen.has(key)) throw new ContentError('errors.invalidBody', 400);

        seen.add(key);

        if (patch.data !== null && patch.data.length > 2_000)
            throw new ContentError('errors.invalidBody', 400);

        if (patch.data !== null) {
            try {
                validateTileIdsForLayer(
                    decodeTileChunk(patch.data),
                    patch.layer
                );
            } catch {
                throw new ContentError('errors.invalidBody', 400);
            }
        }
    }

    return prisma.$transaction(async (tx) => {
        const map = await tx.battleMap.findUniqueOrThrow({
            where: { id: mapId },
            select: { mapVersion: true, cols: true, rows: true },
        });

        if (map.mapVersion !== expectedVersion) throw conflict();

        const maxCx = Math.ceil(map.cols / MAP_LIMITS.chunk);

        const maxCy = Math.ceil(map.rows / MAP_LIMITS.chunk);

        for (const patch of patches)
            if (patch.cx >= maxCx || patch.cy >= maxCy)
                throw new ContentError('errors.invalidBody', 400);

        const current = await tx.battleMapVersion.findUnique({
            where: { mapId_version: { mapId, version: expectedVersion } },
        });

        if (!current) throw conflict();

        const keys = tilePatchKeys(patches);

        const rows = await tx.battleMapChunk.findMany({
            where: {
                mapId,
                OR: keys.map((key) => {
                    const [cx, cy] = key.split(':').map(Number);

                    return { cx, cy };
                }),
            },
        });

        const existing = new Map<string, ExistingTileChunk>(
            rows.map((row) => [
                chunkKey(row.cx, row.cy),
                {
                    data: row.data,
                    layers: parseSnapshot({ k: row.tileLayers }).k,
                },
            ])
        );

        const { nextLayers, writes } = planTileChunkWrites(patches, existing);

        const nextTiles = parseSnapshot(
            (current.payload as { tileLayers?: unknown }).tileLayers
        );

        for (const [key, layers] of nextLayers) {
            if (layers) nextTiles[key] = layers;
            else delete nextTiles[key];
        }

        const { count } = await tx.battleMap.updateMany({
            where: { id: mapId, mapVersion: expectedVersion },
            data: { mapVersion: { increment: 1 } },
        });

        if (!count) throw conflict();

        await Promise.all(
            writes.map((write) =>
                write.kind === 'delete'
                    ? tx.battleMapChunk.deleteMany({
                          where: { mapId, cx: write.cx, cy: write.cy },
                      })
                    : tx.battleMapChunk.upsert({
                          where: {
                              mapId_cx_cy: {
                                  mapId,
                                  cx: write.cx,
                                  cy: write.cy,
                              },
                          },
                          create: {
                              mapId,
                              cx: write.cx,
                              cy: write.cy,
                              data: write.data,
                              tileLayers: write.layers ?? Prisma.DbNull,
                          },
                          update: {
                              tileLayers: write.layers ?? Prisma.DbNull,
                          },
                      })
            )
        );

        const payload = current.payload as Record<string, unknown>;

        await tx.battleMapVersion.create({
            data: {
                mapId,
                version: expectedVersion + 1,
                payload: {
                    ...payload,
                    tileLayers: nextTiles,
                } as Prisma.InputJsonObject,
            },
        });

        await pruneMapVersions(tx, mapId, expectedVersion + 1);

        return expectedVersion + 1;
    });
}
