#!/usr/bin/env tsx
/**
 * One-off: converts ground/wallfill tile layers and objects of current maps into a battle_map_art
 * scene (sceneVersion 1, not baked; objects become stamps) and strips ground/wallfill/edge-art/
 * effects/objects from the CURRENT chunk rows and a new snapshot (mapVersion +1; older snapshots
 * untouched). Stamp footprints are unioned into header blocked/sightBlocked in the same transaction.
 * Maps that already have an art row are skipped, except with --objects: that mode only appends
 * tile objects as stamps to existing art scenes (baked ones are skipped as "needs re-bake" unless
 * --include-baked). Dry run by default; --apply runs one transaction per map. Back up first
 * (scripts/db/backup-database.sh); remote DB needs --allow-remote.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/maps/convert-tiles-to-art.ts [--objects [--include-baked]] [--apply] [--allow-remote]
 */
import { Prisma } from '@prisma/client';

import { mapArtSceneSchema } from '@/lib/schemas/map-art';

import {
    applyConversionTx,
    applyObjectsTx,
    buildConversion,
    buildObjectsConversion,
    type ObjectsReport,
} from '@/scripts/maps/lib/convert-map';
import { countFloorCells } from '@/scripts/maps/lib/tiles-to-scene';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const objectsLine = (o: ObjectsReport) =>
    `objects ${o.total} → stamps ${o.stamps.length} · unknown ${o.unknown} · outside ${o.outside} · new blocked ${o.newBlocked}`;

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

async function main() {
    const argv = process.argv.slice(2);

    const apply = argv.includes('--apply');

    const objectsMode = argv.includes('--objects');

    const includeBaked = argv.includes('--include-baked');

    const host = assertSeedTarget(
        process.env.DATABASE_URL,
        argv.includes('--allow-remote')
    );

    const { prisma } = await import('@/lib/db');

    try {
        console.log(
            `DB: ${host} · ${apply ? 'APPLY' : 'dry run'}${objectsMode ? ' · objects' : ''}`
        );

        const maps = await prisma.battleMap.findMany({
            where: {
                art: objectsMode ? { isNot: null } : null,
                chunks: { some: { tileLayers: { not: Prisma.DbNull } } },
            },
            select: {
                id: true,
                name: true,
                header: true,
                art: { select: { scene: true, bakedSceneVersion: true } },
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
            try {
                if (objectsMode) {
                    if (map.art?.bakedSceneVersion != null && !includeBaked) {
                        skipped++;

                        console.log(`needs re-bake: ${map.id} ${map.name}`);

                        continue;
                    }

                    const addition = map.art
                        ? buildObjectsConversion(
                              mapArtSceneSchema.parse(map.art.scene),
                              map.header,
                              map.chunks
                          )
                        : null;

                    if (!addition) {
                        skipped++;

                        continue;
                    }

                    console.log(`${map.id} "${map.name}" · ${objectsLine(addition.objects)}`);

                    if (!apply) {
                        converted++;

                        continue;
                    }

                    const done = await prisma.$transaction(
                        (tx) => applyObjectsTx(tx, map.id, { includeBaked }),
                        TX_OPTIONS
                    );

                    if (done) converted++;
                    else skipped++;

                    continue;
                }

                const conversion = buildConversion(map.header, map.chunks);

                if (!conversion) {
                    skipped++;

                    continue;
                }

                console.log(
                    `${map.id} "${map.name}" · floor cells ${countFloorCells(conversion.scene)} · walls ${Object.keys(conversion.scene.walls).length} · walls clipped ${conversion.wallsClipped} · dropped edge-art cells ${conversion.dropped.edgeArt} · effects cells ${conversion.dropped.effects} · ${objectsLine(conversion.objects)}`
                );

                if (!apply) {
                    converted++;

                    continue;
                }

                const done = await prisma.$transaction(
                    (tx) => applyConversionTx(tx, map.id),
                    TX_OPTIONS
                );

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
