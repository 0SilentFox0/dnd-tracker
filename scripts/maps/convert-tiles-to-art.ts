#!/usr/bin/env tsx
/**
 * One-off: converts ground/wallfill tile layers of current maps into a battle_map_art scene
 * (sceneVersion 1, not baked) and strips ground/wallfill/edge-art/effects from the CURRENT
 * chunk rows and a new snapshot (mapVersion +1; objects stay; older snapshots untouched).
 * Maps that already have an art row are skipped. Dry run by default; --apply runs one
 * transaction per map. Back up first (scripts/db/backup-database.sh); remote DB needs --allow-remote.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/maps/convert-tiles-to-art.ts [--apply] [--allow-remote]
 */
import { Prisma } from '@prisma/client';

import { applyConversionTx, buildConversion } from '@/scripts/maps/lib/convert-map';
import { countFloorCells } from '@/scripts/maps/lib/tiles-to-scene';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

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
            try {
                const conversion = buildConversion(map.header, map.chunks);

                if (!conversion) {
                    skipped++;

                    continue;
                }

                console.log(
                    `${map.id} "${map.name}" · floor cells ${countFloorCells(conversion.scene)} · walls ${Object.keys(conversion.scene.walls).length} · walls clipped ${conversion.wallsClipped} · dropped edge-art cells ${conversion.dropped.edgeArt} · effects cells ${conversion.dropped.effects}`
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
