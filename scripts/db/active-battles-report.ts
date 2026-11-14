#!/usr/bin/env tsx
/**
 * Read-only: for each battle scene, the storage shape of participant state (system slot),
 * snapshot hash consistency, undo history rows and paused decisions.
 * --expect-idle exits 1 while any scene is active or paused (deploy gate).
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/active-battles-report.ts [--status all|active] [--campaign <id,…>] [--json] [--allow-remote] [--expect-idle]
 */
import type { RawDb } from '@/scripts/db/lib/battle-state-db';
import {
    buildReport,
    formatReport,
    isIdle,
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

        if (args.expectIdle && !isIdle(summary)) process.exitCode = 1;

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
            `підсумок: активних сцен ${summary.activeScenes} · на паузі ${summary.pausedScenes} · кампаній ${summary.campaigns} · учасників slot ${shapes.slot} · none ${shapes.none} · hashMismatch ${summary.hashMismatch} · легасі moraleCap ${summary.legacyMoraleCap}`
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'помилка');
    process.exitCode = 1;
});
