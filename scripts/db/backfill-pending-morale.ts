#!/usr/bin/env tsx
// legacy: needs the pre-drop schema
/**
 * Moves `battle_scenes.pendingMoraleCheck` into the scene slot (`system_state`, the morale entry of `ext`) and nulls the column.
 * Expand-only: the column stays in the schema; reads already fall back to it. Dry run by default; --apply writes with a version guard (no version bump).
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/backfill-pending-morale.ts [--apply] [--allow-remote]
 */
import { Prisma } from '@prisma/client';

import '@/lib/utils/rules/systems/registry';
import { planPendingMorale } from '@/scripts/db/lib/backfill-pending-morale-plan';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const flags = new Set(process.argv.slice(2));

async function main() {
    assertSeedTarget(process.env.DATABASE_URL, flags.has('--allow-remote'));

    const { prisma } = await import('@/lib/db');

    try {
        const rows = await prisma.battleScene.findMany({
            where: { NOT: { pendingMoraleCheck: { equals: Prisma.DbNull } } },
            select: {
                id: true,
                version: true,
                pendingMoraleCheck: true,
                systemState: true,
            },
        });

        const { changes, skipped } = planPendingMorale(rows);

        console.log(
            `${flags.has('--apply') ? 'APPLY' : 'DRY RUN'} · with column ${rows.length} · to move ${changes.length} · skipped ${skipped.length}`
        );

        if (!flags.has('--apply')) return;

        let written = 0;

        for (const change of changes) {
            const { count } = await prisma.battleScene.updateMany({
                where: { id: change.id, version: change.version },
                data: {
                    systemState: change.systemState as unknown as Prisma.InputJsonValue,
                    pendingMoraleCheck: Prisma.DbNull,
                },
            });

            written += count;

            if (count === 0) console.log(`changed meanwhile, rerun: ${change.id}`);
        }

        console.log(`written ${written}/${changes.length}`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
