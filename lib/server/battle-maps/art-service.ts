import { isDeepStrictEqual } from 'node:util';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import type { BattleMapSaveInput } from '@/lib/schemas/battle-maps';
import { storedRecord } from '@/lib/schemas/stored-json';
import { removeUnreferencedBackgrounds } from '@/lib/server/battle-maps/background-cleanup';
import {
    clearArtBakedTx,
    lockMapRow,
    saveMapTx,
} from '@/lib/server/battle-maps/library-service';
import { ContentError } from '@/lib/server/content/errors';
import { toInputJsonObject } from '@/lib/utils/common/json';
import type {
    ArtMapPatch,
    BattleMapFull,
    MapArtRecord,
    MapArtSaveResult,
    MapArtScene,
} from '@/types/battle-map';

const EMPTY: MapArtRecord = {
    scene: null,
    sceneVersion: 0,
    bakedSceneVersion: null,
    bakedUrl: null,
    bakedAt: null,
};

const conflict = () => new ContentError(API_ERRORS.BATTLE_MAP_CONFLICT, 409);

const toRecord = (row: {
    scene: unknown;
    sceneVersion: number;
    bakedSceneVersion: number | null;
    bakedUrl: string | null;
    bakedAt: Date | null;
}): MapArtRecord => ({
    scene: row.scene as MapArtScene,
    sceneVersion: row.sceneVersion,
    bakedSceneVersion: row.bakedSceneVersion,
    bakedUrl: row.bakedUrl,
    bakedAt: row.bakedAt?.toISOString() ?? null,
});

export async function getArt(mapId: string): Promise<MapArtRecord> {
    const row = await prisma.battleMapArt.findUnique({ where: { mapId } });

    return row ? toRecord(row) : EMPTY;
}

export async function saveArt(
    mapId: string,
    input: {
        save: BattleMapSaveInput;
        scene: MapArtScene;
        expectedSceneVersion: number;
        baked: boolean;
    }
): Promise<MapArtSaveResult> {
    const { save, scene, expectedSceneVersion, baked } = input;

    const { result, released } = await prisma.$transaction(async (tx) => {
        await lockMapRow(tx, mapId, 'update');

        const old = await tx.battleMapArt.findUnique({ where: { mapId } });

        const currentVersion = old?.sceneVersion ?? 0;

        if (expectedSceneVersion !== currentVersion) throw conflict();

        const changed =
            !old ||
            !isDeepStrictEqual(
                JSON.parse(JSON.stringify(old.scene)),
                JSON.parse(JSON.stringify(scene))
            );

        const sceneVersion = !old ? 1 : changed ? currentVersion + 1 : currentVersion;

        const stale = !baked && old?.bakedSceneVersion !== sceneVersion;

        const { brief, released } = await saveMapTx(tx, mapId, save, {
            artBaked: baked ? true : stale ? false : undefined,
        });

        const bakedFields = baked
            ? {
                  bakedSceneVersion: sceneVersion,
                  bakedUrl: save.map.background ?? null,
                  bakedAt: new Date(),
              }
            : {};

        const sceneJson = toInputJsonObject(scene);

        const row = await tx.battleMapArt.upsert({
            where: { mapId },
            create: {
                mapId,
                scene: sceneJson,
                sceneVersion,
                ...bakedFields,
            },
            update: { scene: sceneJson, sceneVersion, ...bakedFields },
        });

        const mapRow = await tx.battleMap.findUniqueOrThrow({
            where: { id: mapId },
            select: { header: true },
        });

        const header = storedRecord<BattleMapFull['map']>().parse(
            mapRow.header
        );

        const patch: ArtMapPatch = {
            walls: save.walls,
            bars: save.bars,
            doors: header.doors,
            blocked: header.blocked,
            background: header.background,
            backgroundCols: header.backgroundCols,
            backgroundRows: header.backgroundRows,
            gridOffset: header.gridOffset,
            artBaked: header.artBaked,
        };

        return {
            result: { brief, art: toRecord(row), patch },
            released,
        };
    });

    await removeUnreferencedBackgrounds(released.campaignId, released.urls);

    return result;
}

export async function deleteArt(mapId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
        await lockMapRow(tx, mapId, 'update');

        await tx.battleMapArt.deleteMany({ where: { mapId } });

        await clearArtBakedTx(tx, mapId);
    });
}
