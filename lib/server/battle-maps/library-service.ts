import type { Prisma } from '@prisma/client';

import {
    assembleGeometry,
    chunksToRecord,
    memoGeometry,
    recordToChunkRows,
} from './assemble';

import { prisma } from '@/lib/db';
import type { BattleMapInput } from '@/lib/schemas/battle-maps';
import { encodeEdges } from '@/lib/utils/battle/map-storage/edge-chunks';
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

const headerOf = (map: BattleMapInput['map'] | BattleMapConfig): Header => {
    const { walls: _walls, bars: _bars, ...header } = map as BattleMapConfig;

    return header;
};

const payloadOf = (input: BattleMapInput) => {
    const header = headerOf(input.map);

    const chunks = encodeEdges(input, header.cols, header.rows);

    return {
        header,
        chunks,
        headerJson: header as unknown as Prisma.InputJsonObject,
        payloadJson: { header, chunks } as unknown as Prisma.InputJsonObject,
    };
};

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

/** `version` omitted = current; older versions come from the snapshot rows. */
export async function getMap(
    mapId: string,
    version?: number
): Promise<OwnedBattleMap | null> {
    const row = await prisma.battleMap.findUnique({ where: { id: mapId } });

    if (!row) return null;

    const target = version ?? row.mapVersion;

    if (target > row.mapVersion) return null;

    const geometry = await memoGeometry(mapId, target, async () => {
        if (target === row.mapVersion) {
            const chunks = await prisma.battleMapChunk.findMany({
                where: { mapId },
            });

            return assembleGeometry(
                row.header as unknown as Header,
                chunksToRecord(chunks)
            );
        }

        const snapshot = await prisma.battleMapVersion.findUnique({
            where: { mapId_version: { mapId, version: target } },
        });

        if (!snapshot) throw new MapVersionGone();

        const payload = snapshot.payload as unknown as {
            header: Header;
            chunks: Record<string, string>;
        };

        return assembleGeometry(payload.header, payload.chunks);
    }).catch((e) => {
        if (e instanceof MapVersionGone) return null;

        throw e;
    });

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

class MapVersionGone extends Error {}

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

        const pinned = await tx.battleScene.findMany({
            where: { mapId },
            select: { mapVersion: true },
        });

        const keep = pinned.flatMap((b) =>
            b.mapVersion === null ? [] : [b.mapVersion]
        );

        await tx.battleMapVersion.deleteMany({
            where: {
                mapId,
                version: { lt: row.mapVersion, notIn: keep },
            },
        });

        return toBrief(row);
    });
}

export async function deleteMap(mapId: string): Promise<'ok' | 'in-use'> {
    const used = await prisma.battleScene.count({ where: { mapId } });

    if (used > 0) return 'in-use';

    await prisma.battleMap.delete({ where: { id: mapId } });

    return 'ok';
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
