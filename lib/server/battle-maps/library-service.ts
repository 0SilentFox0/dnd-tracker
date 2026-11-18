import type { Prisma } from '@prisma/client';
import { isDeepStrictEqual } from 'node:util';

import {
    assembleGeometry,
    type MapGeometry,
    memoGeometry,
    recordToChunkRows,
} from './assemble';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { prisma } from '@/lib/db';
import type {
    BattleMapInput,
    BattleMapSaveInput,
} from '@/lib/schemas/battle-maps';
import { storedRecord } from '@/lib/schemas/stored-json';
import {
    backgroundOf,
    removeUnreferencedBackgrounds,
} from '@/lib/server/battle-maps/background-cleanup';
import { verifyBattleMapBackground } from '@/lib/server/battle-maps/background-upload';
import { ContentError } from '@/lib/server/content/errors';
import { resolveMapBackgroundForPersistence } from '@/lib/supabase/battle-map-storage';
import { chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import {
    type EdgeChunks,
    EMPTY_EDGE_CHUNK,
    encodeEdges,
} from '@/lib/utils/battle/map-storage/edge-chunks';
import { withoutEdges } from '@/lib/utils/battle/map-storage/persisted-map';
import { isTileLayer, type TileLayer } from '@/lib/utils/battle/tiles/types';
import { isHostedOnProjectStorage } from '@/lib/utils/common/image-url';
import { toInputJsonObject } from '@/lib/utils/common/json';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { BattleMapBrief, BattleMapFull } from '@/types/battle-map';

type Header = BattleMapFull['map'];

export type OwnedBattleMap = BattleMapFull & { campaignId: string };

const toBrief = (r: {
    id: string;
    name: string;
    cols: number;
    rows: number;
    mapVersion: number;
    updatedAt: Date;
}): BattleMapBrief => ({
    id: r.id,
    name: r.name,
    cols: r.cols,
    rows: r.rows,
    version: r.mapVersion,
    updatedAt: r.updatedAt.toISOString(),
});

const payloadOf = (input: BattleMapInput) => {
    const header = withoutEdges(input.map as BattleMapConfig);

    const chunks = encodeEdges(input, header.cols, header.rows);

    return {
        header,
        chunks,
        headerJson: toInputJsonObject(header),
        payloadJson: toInputJsonObject({ header, chunks, tileLayers: {} }),
    };
};

/** Mirrors an external background into project storage so linked battles never copy a foreign URL. */
export async function withStoredBackground<T extends BattleMapInput>(
    input: T,
    campaignId: string,
    current?: string | null
): Promise<T> {
    const background = input.map.background;

    if (
        background &&
        background !== current &&
        isHostedOnProjectStorage(background)
    ) {
        const check = await verifyBattleMapBackground(campaignId, background);

        if (check === 'unavailable')
            throw new ContentError(API_ERRORS.INTERNAL, 503);

        if (check === 'invalid') {
            await removeUnreferencedBackgrounds(campaignId, [background]);

            throw new ContentError(
                API_ERRORS.BATTLE_MAP_BACKGROUND_INVALID,
                400
            );
        }
    }

    const r = await resolveMapBackgroundForPersistence(input.map.background, {
        campaignId,
        current,
    });

    if (!r.ok) throw new ContentError(r.message, 400, undefined, r.params);

    return {
        ...input,
        map: { ...input.map, background: r.background ?? null },
    } as T;
}

export async function listMaps(campaignId: string): Promise<BattleMapBrief[]> {
    const rows = await prisma.battleMap.findMany({
        where: { campaignId },
        orderBy: { updatedAt: 'desc' },
        select: {
            id: true,
            name: true,
            cols: true,
            rows: true,
            mapVersion: true,
            updatedAt: true,
        },
    });

    return rows.map(toBrief);
}

function tileLayersFromRows(
    rows: readonly { cx: number; cy: number; tileLayers: unknown }[]
) {
    const snapshot: Record<string, Partial<Record<TileLayer, string>>> = {};

    for (const row of rows) {
        if (
            !row.tileLayers ||
            typeof row.tileLayers !== 'object' ||
            Array.isArray(row.tileLayers)
        )
            continue;

        const layers: Partial<Record<TileLayer, string>> = {};

        for (const [layer, data] of Object.entries(row.tileLayers))
            if (isTileLayer(layer) && typeof data === 'string')
                layers[layer] = data;

        if (Object.keys(layers).length)
            snapshot[chunkKey(row.cx, row.cy)] = layers;
    }

    return snapshot;
}

type TileSnapshot = ReturnType<typeof tileLayersFromRows>;

/** Tile layers ride on the edge chunk rows; a chunk with tiles but no edges still needs a row. */
function chunkRowsWithTiles(chunks: EdgeChunks, tileLayers: TileSnapshot) {
    const rows = new Map<
        string,
        Omit<Prisma.BattleMapChunkCreateManyInput, 'mapId'>
    >(
        recordToChunkRows(chunks).map((chunk) => [
            chunkKey(chunk.cx, chunk.cy),
            chunk,
        ])
    );

    for (const [key, layers] of Object.entries(tileLayers)) {
        const [cx, cy] = key.split(':').map(Number);

        rows.set(key, {
            ...(rows.get(key) ?? { cx, cy, data: EMPTY_EDGE_CHUNK }),
            tileLayers: layers,
        });
    }

    return [...rows.values()];
}

export async function createMap(
    campaignId: string,
    input: BattleMapInput,
    tileLayers: TileSnapshot = {}
): Promise<BattleMapBrief> {
    const { header, chunks, headerJson, payloadJson } = payloadOf(input);

    if (
        (await prisma.battleMap.count({ where: { campaignId } })) >=
        MAP_LIMITS.maxPerCampaign
    )
        throw new ContentError(API_ERRORS.BATTLE_MAP_LIMIT, 409, undefined, {
            max: MAP_LIMITS.maxPerCampaign,
        });

    const row = await prisma.battleMap.create({
        data: {
            campaignId,
            name: input.name,
            cols: header.cols,
            rows: header.rows,
            header: headerJson,
            chunks: { create: chunkRowsWithTiles(chunks, tileLayers) },
            versions: {
                create: {
                    version: 1,
                    payload: {
                        ...payloadJson,
                        tileLayers,
                    } as Prisma.InputJsonObject,
                },
            },
        },
    });

    return toBrief(row);
}

export interface BattleMapMeta {
    campaignId: string;
    version: number;
    cols: number;
    rows: number;
    header: Header;
}

type MapDb = Pick<Prisma.TransactionClient, 'battleMap'>;

/** Ownership and current version without loading any geometry. */
export async function getMapMeta(
    mapId: string,
    db: MapDb = prisma
): Promise<BattleMapMeta | null> {
    const row = await db.battleMap.findUnique({
        where: { id: mapId },
        select: {
            campaignId: true,
            mapVersion: true,
            cols: true,
            rows: true,
            header: true,
        },
    });

    return row
        ? {
              campaignId: row.campaignId,
              version: row.mapVersion,
              cols: row.cols,
              rows: row.rows,
              header: storedRecord<Header>().parse(row.header),
          }
        : null;
}

async function loadVersionGeometry(
    mapId: string,
    version: number
): Promise<MapGeometry | null> {
    const snapshot = await prisma.battleMapVersion.findUnique({
        where: { mapId_version: { mapId, version } },
    });

    if (!snapshot) return null;

    const payload = storedRecord<{
        header: Header;
        chunks: Record<string, string>;
    }>().parse(snapshot.payload);

    return assembleGeometry(payload.header, payload.chunks);
}

/** A battle pinned (mapId, version) proves the map exists, so the memo is probed before any row is read. */
export async function getPinnedGeometry(
    mapId: string,
    version: number
): Promise<MapGeometry | null> {
    return memoGeometry(mapId, version, () =>
        loadVersionGeometry(mapId, version)
    );
}

/** `version` omitted = current; older versions come from the snapshot rows. */
export async function getMap(
    mapId: string,
    version?: number,
    attempt = 0
): Promise<OwnedBattleMap | null> {
    const row = await prisma.battleMap.findUnique({ where: { id: mapId } });

    if (!row) return null;

    const target = version ?? row.mapVersion;

    if (target > row.mapVersion) return null;

    const geometry = await memoGeometry(mapId, target, () =>
        loadVersionGeometry(mapId, target)
    );

    // A concurrent save pruned the version we read as current: retry against the fresh row.
    if (!geometry && version === undefined && attempt < 2)
        return getMap(mapId, undefined, attempt + 1);

    if (!geometry) return null;

    return {
        ...toBrief(row),
        version: target,
        cols: geometry.map.cols,
        rows: geometry.map.rows,
        campaignId: row.campaignId,
        ...geometry,
    };
}

export async function pruneMapVersions(
    tx: Prisma.TransactionClient,
    mapId: string,
    current: number
) {
    const pinned = await tx.battleScene.findMany({
        where: { mapId },
        select: { mapVersion: true },
    });

    const keep = pinned.flatMap((b) =>
        b.mapVersion === null ? [] : [b.mapVersion]
    );

    await tx.battleMapVersion.deleteMany({
        where: { mapId, version: { lt: current, notIn: keep } },
    });
}

const conflict = () => new ContentError(API_ERRORS.BATTLE_MAP_CONFLICT, 409);

const plain = (v: unknown) => JSON.parse(JSON.stringify(v)) as unknown;

/** `input.expectedVersion` guards against overwriting a newer save; an identical payload only renames. */
export async function saveMap(
    mapId: string,
    input: BattleMapSaveInput
): Promise<BattleMapBrief> {
    const { header, chunks, headerJson, payloadJson } = payloadOf(input);

    const released: { campaignId: string; urls: (string | null)[] } = {
        campaignId: '',
        urls: [],
    };

    const brief = await prisma.$transaction(async (tx) => {
        const current = await tx.battleMap.findUniqueOrThrow({
            where: { id: mapId },
            select: { mapVersion: true, header: true, campaignId: true },
        });

        released.campaignId = current.campaignId;

        released.urls.push(backgroundOf(current.header));

        const base = current.mapVersion;

        if (input.expectedVersion !== base) throw conflict();

        const oldRows = await tx.battleMapChunk.findMany({
            where: { mapId },
            select: { cx: true, cy: true, data: true, tileLayers: true },
        });

        const tileLayers = tileLayersFromRows(oldRows);

        const versionPayload = {
            ...payloadJson,
            tileLayers,
        } as Prisma.InputJsonObject;

        const snapshot = await tx.battleMapVersion.findUnique({
            where: { mapId_version: { mapId, version: base } },
        });

        const snapshotPayload = snapshot
            ? (plain(snapshot.payload) as Record<string, unknown>)
            : null;

        released.urls.push(backgroundOf(snapshotPayload?.header));

        const unchanged =
            !!snapshotPayload &&
            isDeepStrictEqual(
                {
                    ...snapshotPayload,
                    tileLayers: snapshotPayload.tileLayers ?? {},
                },
                plain(versionPayload)
            );

        const { count } = await tx.battleMap.updateMany({
            where: { id: mapId, mapVersion: base },
            data: unchanged
                ? { name: input.name }
                : {
                      name: input.name,
                      cols: header.cols,
                      rows: header.rows,
                      header: headerJson,
                      mapVersion: { increment: 1 },
                  },
        });

        if (count === 0) throw conflict();

        const row = await tx.battleMap.findUniqueOrThrow({
            where: { id: mapId },
        });

        if (unchanged) return toBrief(row);

        await tx.battleMapChunk.deleteMany({ where: { mapId } });

        await tx.battleMapChunk.createMany({
            data: chunkRowsWithTiles(chunks, tileLayers).map((row) => ({
                mapId,
                ...row,
            })),
        });

        await tx.battleMapVersion.create({
            data: {
                mapId,
                version: row.mapVersion,
                payload: versionPayload,
            },
        });

        await pruneMapVersions(tx, mapId, row.mapVersion);

        return toBrief(row);
    });

    await removeUnreferencedBackgrounds(released.campaignId, released.urls);

    return brief;
}

/** Row lock serializes against battle creation, which share-locks the map before pinning it. */
export async function lockMapRow(
    tx: Pick<Prisma.TransactionClient, '$queryRaw'>,
    mapId: string,
    mode: 'share' | 'update'
) {
    await (mode === 'share'
        ? tx.$queryRaw`SELECT 1 FROM battle_maps WHERE id = ${mapId} FOR SHARE`
        : tx.$queryRaw`SELECT 1 FROM battle_maps WHERE id = ${mapId} FOR UPDATE`);
}

export async function deleteMap(mapId: string): Promise<'ok' | 'in-use'> {
    let released: { campaignId: string; urls: (string | null)[] } | undefined;

    const result = await prisma.$transaction(async (tx) => {
        await lockMapRow(tx, mapId, 'update');

        if ((await tx.battleScene.count({ where: { mapId } })) > 0)
            return 'in-use';

        const row = await tx.battleMap.findUnique({
            where: { id: mapId },
            select: { campaignId: true, header: true },
        });

        const versions = await tx.battleMapVersion.findMany({
            where: { mapId },
            select: { payload: true },
        });

        await tx.battleMap.delete({ where: { id: mapId } });

        released = {
            campaignId: row?.campaignId ?? '',
            urls: [
                backgroundOf(row?.header),
                ...versions.map((v) =>
                    backgroundOf((v.payload as { header?: unknown }).header)
                ),
            ],
        };

        return 'ok';
    });

    if (result === 'ok' && released)
        await removeUnreferencedBackgrounds(released.campaignId, released.urls);

    return result;
}

export async function cloneMap(
    map: OwnedBattleMap,
    name?: string
): Promise<BattleMapBrief> {
    const rows = await prisma.battleMapChunk.findMany({
        where: { mapId: map.id },
        select: { cx: true, cy: true, tileLayers: true },
    });

    return createMap(
        map.campaignId,
        {
            name: name ?? `${map.name} (copy)`.slice(0, 80),
            map: map.map as BattleMapInput['map'],
            walls: map.walls,
            bars: map.bars,
        },
        tileLayersFromRows(rows)
    );
}
