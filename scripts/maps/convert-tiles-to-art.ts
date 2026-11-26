#!/usr/bin/env tsx
/**
 * One-off: converts ground/wallfill tile layers of current maps into a battle_map_art scene
 * (sceneVersion 1, not baked) and strips ground/wallfill/edge-art/effects from the CURRENT
 * battle_map_chunks.tile_layers (objects stay; versioned snapshots are never touched).
 * Maps that already have an art row are skipped. Dry run by default; --apply runs one
 * transaction per map. Back up first (scripts/db/backup-database.sh); remote DB needs --allow-remote.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/maps/convert-tiles-to-art.ts [--apply] [--allow-remote]
 */
import { Prisma } from '@prisma/client';

import { mapArtSceneSchema } from '@/lib/schemas/map-art';
import { storedRecord } from '@/lib/schemas/stored-json';
import { assembleGeometry } from '@/lib/server/battle-maps/assemble';
import { chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import type { EdgeChunks } from '@/lib/utils/battle/map-storage/edge-chunks';
import { isRecord } from '@/lib/utils/common/is-record';
import { toInputJsonObject } from '@/lib/utils/common/json';
import {
    type ChunkTileLayers,
    countFloorCells,
    hasFloorLayers,
    stripArtLayers,
    tilesToScene,
} from '@/scripts/maps/lib/tiles-to-scene';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';
import type { BattleMapFull } from '@/types/battle-map';

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

async function main() {
    const argv = process.argv.slice(2);

    const apply = argv.includes('--apply');

    const host = assertSeedTarget(
        process.env.DATABASE_URL,
        argv.includes('--allow-remote')
    );

    const { prisma } = await import('@/lib/db');

    try {
        console.log(`DB: ${host} · ${apply ? 'APPLY' : 'dry run'}`);

        const maps = await prisma.battleMap.findMany({
            where: {
                art: null,
                chunks: { some: { tileLayers: { not: Prisma.DbNull } } },
            },
            select: {
                id: true,
                name: true,
                header: true,
                chunks: {
                    select: {
                        cx: true,
                        cy: true,
                        data: true,
                        tileLayers: true,
                    },
                },
            },
            orderBy: { id: 'asc' },
        });

        let converted = 0;

        let skipped = 0;

        for (const map of maps) {
            const tileLayers: ChunkTileLayers = {};

            for (const c of map.chunks)
                if (isRecord(c.tileLayers))
                    tileLayers[chunkKey(c.cx, c.cy)] = c.tileLayers;

            if (!hasFloorLayers(tileLayers)) {
                skipped++;

                continue;
            }

            try {
                const header = storedRecord<BattleMapFull['map']>().parse(
                    map.header
                );

                const edges: EdgeChunks = Object.fromEntries(
                    map.chunks.map((c) => [chunkKey(c.cx, c.cy), c.data])
                );

                const geometry = assembleGeometry(header, edges);

                const scene = tilesToScene(tileLayers, {
                    ...geometry.map,
                    walls: geometry.walls,
                    bars: geometry.bars,
                });

                const parsed = mapArtSceneSchema.safeParse(scene);

                if (!parsed.success)
                    throw new Error('scene failed mapArtSceneSchema');

                console.log(
                    `${map.id} "${map.name}" · floor cells ${countFloorCells(scene)} · walls ${Object.keys(scene.walls).length}`
                );

                if (!apply) {
                    converted++;

                    continue;
                }

                const done = await prisma.$transaction(async (tx) => {
                    if (
                        await tx.battleMapArt.findUnique({
                            where: { mapId: map.id },
                        })
                    )
                        return false;

                    await tx.battleMapArt.create({
                        data: {
                            mapId: map.id,
                            scene: toInputJsonObject(scene),
                            sceneVersion: 1,
                        },
                    });

                    for (const c of map.chunks) {
                        if (!isRecord(c.tileLayers)) continue;

                        const rest = stripArtLayers(
                            c.tileLayers as Record<string, string>
                        );

                        await tx.battleMapChunk.update({
                            where: {
                                mapId_cx_cy: {
                                    mapId: map.id,
                                    cx: c.cx,
                                    cy: c.cy,
                                },
                            },
                            data: {
                                tileLayers: rest
                                    ? toInputJsonObject(rest)
                                    : Prisma.DbNull,
                            },
                        });
                    }

                    return true;
                }, TX_OPTIONS);

                if (done) converted++;
                else skipped++;
            } catch (error) {
                skipped++;

                console.error(
                    `${map.id} skipped: ${error instanceof Error ? error.message : 'unknown error'}`
                );
            }
        }

        console.log(
            `${apply ? 'converted' : 'would convert'} ${converted} · skipped ${skipped}`
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
