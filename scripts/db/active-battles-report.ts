#!/usr/bin/env tsx
/**
 * Read-only: for each battle scene, the storage shape of participant state (legacy flat fields, system slot, mixed),
 * snapshot hash consistency, undo history rows and paused decisions.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/active-battles-report.ts [--status active|all] [--campaign <id,…>] [--json] [--allow-remote]
 */
import type { RawDb } from '@/scripts/db/lib/battle-state-db';
import {
    buildReport,
    formatReport,
    parseReportArgs,
    summarizeReports,
} from '@/scripts/db/lib/battle-state-plan';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

async function main() {
    const args = parseReportArgs(process.argv.slice(2));

    const host = assertSeedTarget(process.env.DATABASE_URL, args.allowRemote);

    const database = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);

    const { loadHistory, loadParticipants, loadScenes } = await import(
        '@/scripts/db/lib/battle-state-db'
    );

    const { prisma } = await import('@/lib/db');

    try {
        const db = prisma as unknown as RawDb;

        const scenes = await loadScenes(db, {
            status: args.status,
            campaignIds: args.campaignIds,
        });

        const ids = scenes.map((s) => s.id);

        const reports = buildReport(
            scenes,
            await loadParticipants(db, ids),
            await loadHistory(db, ids)
        );

        const summary = summarizeReports(reports);

        if (args.json) {
            console.log(JSON.stringify({ summary, scenes: reports }, null, 2));

            return;
        }

        console.log(
            `БД: ${host}/${database} · статус ${args.status} · сцен ${summary.scenes}`
        );

        for (const report of reports)
            for (const line of formatReport(report)) console.log(line);

        const { shapes } = summary;

        console.log(
            `підсумок: активних сцен ${summary.activeScenes} · кампаній ${summary.campaigns} · учасників legacy ${shapes.legacy} · slot ${shapes.slot} · mixed ${shapes.mixed} · none ${shapes.none} · hashMismatch ${summary.hashMismatch}`
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'помилка');
    process.exitCode = 1;
});
