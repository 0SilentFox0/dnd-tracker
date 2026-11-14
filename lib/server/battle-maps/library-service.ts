import type { Prisma } from '@prisma/client';

import {
    assembleGeometry,
    type MapGeometry,
    memoGeometry,
    recordToChunkRows,
} from './assemble';

import { prisma } from '@/lib/db';
import type { BattleMapInput } from '@/lib/schemas/battle-maps';
import { ContentError } from '@/lib/server/content/errors';
import { resolveMapBackgroundForPersistence } from '@/lib/supabase/battle-map-storage';
import { encodeEdges } from '@/lib/utils/battle/map-storage/edge-chunks';
import { withoutEdges } from '@/lib/utils/battle/map-storage/persisted-map';
import type { BattleMapConfig } from '@/types/battle';
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
        headerJson: header as unknown as Prisma.InputJsonObject,
        payloadJson: { header, chunks } as unknown as Prisma.InputJsonObject,
    };
};

/** Mirrors an external background into project storage so linked battles never copy a foreign URL. */
export async function withStoredBackground(
    input: BattleMapInput,
    campaignId: string,
    current?: string | null
): Promise<BattleMapInput> {
    const r = await resolveMapBackgroundForPersistence(input.map.background, {
        campaignId,
        current,
    });

    if (!r.ok) throw new ContentError(r.message, 400, undefined, r.params);

    return {
        ...input,
        map: { ...input.map, background: r.background ?? null },
    };
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

export async function createMap(
    campaignId: string,
    input: BattleMapInput
): Promise<BattleMapBrief> {
    const { header, chunks, headerJson, payloadJson } = payloadOf(input);

    const row = await prisma.battleMap.create({
        data: {
            campaignId,
            name: input.name,
            cols: header.cols,
            rows: header.rows,
            header: headerJson,
            chunks: { create: recordToChunkRows(chunks) },
            versions: {
                create: { version: 1, payload: payloadJson },
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
              header: row.header as unknown as Header,
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

    const payload = snapshot.payload as unknown as {
        header: Header;
        chunks: Record<string, string>;
    };

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

async function pruneVersions(
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

export async function saveMap(
    mapId: string,
    input: BattleMapInput
): Promise<BattleMapBrief> {
    const { header, chunks, headerJson, payloadJson } = payloadOf(input);

    return prisma.$transaction(async (tx) => {
        const row = await tx.battleMap.update({
            where: { id: mapId },
            data: {
                name: input.name,
                cols: header.cols,
                rows: header.rows,
                header: headerJson,
                mapVersion: { increment: 1 },
            },
        });

        await tx.battleMapChunk.deleteMany({ where: { mapId } });

        await tx.battleMapChunk.createMany({
            data: recordToChunkRows(chunks).map((c) => ({ mapId, ...c })),
        });

        await tx.battleMapVersion.create({
            data: {
                mapId,
                version: row.mapVersion,
                payload: payloadJson,
            },
        });

        await pruneVersions(tx, mapId, row.mapVersion);

        return toBrief(row);
    });
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
    return prisma.$transaction(async (tx) => {
        await lockMapRow(tx, mapId, 'update');

        if ((await tx.battleScene.count({ where: { mapId } })) > 0)
            return 'in-use';

        await tx.battleMap.delete({ where: { id: mapId } });

        return 'ok';
    });
}

export async function cloneMap(
    map: OwnedBattleMap,
    name?: string
): Promise<BattleMapBrief> {
    return createMap(map.campaignId, {
        name: name ?? `${map.name} (copy)`.slice(0, 80),
        map: map.map as BattleMapInput['map'],
        walls: map.walls,
        bars: map.bars,
    });
}
