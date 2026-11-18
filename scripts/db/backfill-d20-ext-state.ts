#!/usr/bin/env tsx
/**
 * Moves the flat pre-ext d20 slot fields of `battle_participants.state` into the slot's `ext` map, one entry per owning module (deathsaves, inspiration, offhand).
 * Expand-only: reads already fall back to the flat shape; nothing else is touched (`snapshot`/`snapshotHash` are not part of `state`). Dry run by default; --apply writes with a compare-and-set on the old text.
 * `battle_snapshots` (history) is left as is: it is read through the same fallback.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/backfill-d20-ext-state.ts [--apply] [--allow-remote]
 */
import { Prisma } from '@prisma/client';

import '@/lib/utils/rules/systems/registry';
import { planD20ExtState } from '@/scripts/db/lib/backfill-d20-ext-state-plan';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const flags = new Set(process.argv.slice(2));

async function main() {
    assertSeedTarget(process.env.DATABASE_URL, flags.has('--allow-remote'));

    const { prisma } = await import('@/lib/db');

    try {
        const found = await prisma.$queryRaw<Array<{ id: string; raw: string }>>(
            Prisma.sql`SELECT id, state::text AS raw FROM battle_participants WHERE jsonb_typeof(state #> '{system,data}') = 'object'`
        );

        const rows = found.map((r) => ({
            id: r.id,
            raw: r.raw,
            state: JSON.parse(r.raw) as unknown,
        }));

        const { changes } = planD20ExtState(rows);

        console.log(
            `${flags.has('--apply') ? 'APPLY' : 'DRY RUN'} · candidate rows ${rows.length} · to rewrite ${changes.length}`
        );

        if (!flags.has('--apply')) return;

        let written = 0;

        for (const change of changes) {
            written += await prisma.$executeRaw(
                Prisma.sql`UPDATE battle_participants SET state = ${JSON.stringify(change.state)}::jsonb WHERE id = ${change.id} AND state::text = ${change.before}`
            );
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
