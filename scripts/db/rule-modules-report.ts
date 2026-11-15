#!/usr/bin/env tsx
/**
 * Read-only: рядки campaigns.rules / battle_scenes.rules з базою d20 і явним масивом modules (розбивка за повнотою набору пресета).
 *
 *   pnpm exec tsx scripts/db/rule-modules-report.ts [--json] [--allow-remote] [--expect-zero]
 */
import '@/lib/utils/rules/systems/registry';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const flags = new Set(process.argv.slice(2));

async function main() {
    assertSeedTarget(process.env.DATABASE_URL, flags.has('--allow-remote'));

    const { prisma } = await import('@/lib/db');

    const { loadRows } = await import(
        '@/scripts/db/lib/backfill-rule-modules-db'
    );

    const { reportRows } = await import(
        '@/scripts/db/lib/rule-modules-report-lib'
    );

    try {
        const rows = await loadRows(
            prisma as unknown as import('@/scripts/db/lib/raw-db').RawDb
        );

        const report = reportRows(rows);

        if (flags.has('--json')) console.log(JSON.stringify(report, null, 2));
        else
            for (const [group, c] of Object.entries(report.groups))
                console.log(
                    `${group}: порожній ${c.empty} · неповний ${c.partial} · повний ${c.full}`
                );

        console.log(
            `рядків ${report.rows} · з базою d20 і явним modules ${report.explicit} · без повного набору ${report.incomplete}`
        );

        if (flags.has('--expect-zero') && report.incomplete > 0)
            process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'помилка');
    process.exitCode = 1;
});
