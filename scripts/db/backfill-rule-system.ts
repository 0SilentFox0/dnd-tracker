#!/usr/bin/env tsx
/**
 * Дописує `system.key` (і, де потрібно, `system.modules`) у campaigns.rules та battle_scenes.rules.
 * Без --apply — лише звіт (dry-run). Apply — одна транзакція з оптимістичним замком і файлом-знімком для --revert.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/backfill-rule-system.ts [--apply | --revert <file>] [--allow-remote] [--json] [--skip-modules <id,…>] [--snapshot-dir <dir>] [--force]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { RawDb } from '@/scripts/db/lib/backfill-rule-system-db';
import {
    formatPlan,
    planAll,
    summarizePlans,
} from '@/scripts/db/lib/backfill-rule-system-plan';
import {
    type CliArgs,
    parseArgs,
    parseSnapshot,
    type RuleSystemSnapshot,
    snapshotFileName,
    snapshotKey,
} from '@/scripts/db/lib/backfill-rule-system-snapshot';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

type Db = typeof import('@/lib/db').prisma;

/** the extended client's overloaded `$transaction` does not unify with the narrow interface */
const raw = (prisma: Db) => prisma as unknown as RawDb;

async function plan(prisma: Db, args: CliArgs) {
    const { loadFacts, loadRows } = await import(
        '@/scripts/db/lib/backfill-rule-system-db'
    );

    const rows = await loadRows(raw(prisma));

    const facts = await loadFacts(
        prisma,
        rows.map((r) => r.campaignId)
    );

    const plans = planAll(rows, facts, args.skipModules);

    return { rows, plans, summary: summarizePlans(plans) };
}

function printReport(
    header: string,
    { plans, summary }: Awaited<ReturnType<typeof plan>>
) {
    console.log(header);

    for (const p of plans) for (const line of formatPlan(p)) console.log(line);

    const { skipped, warnings } = summary;

    console.log(
        `— пропущено: явні modules ${skipped.explicitModules} · невалідний system ${skipped.invalidSystem} · не обʼєкт ${skipped.notObject}`
    );

    const skippedTotal = Object.values(skipped).reduce((a, b) => a + b, 0);

    console.log(
        `підсумок: записати ${summary.write} (лише key ${summary.keyOnly}, з modules ${summary.withModules}) · без змін ${summary.unchanged} · пропущено ${skippedTotal} · ⚠ activeBattle ${warnings.activeBattle}, legacyUnsafe ${warnings.legacyUnsafe}, guessDiffersFromSource ${warnings.guessDiffersFromSource}`
    );
}

async function revert(prisma: Db, args: CliArgs, header: string) {
    const { currentTexts, revertSnapshot } = await import(
        '@/scripts/db/lib/backfill-rule-system-db'
    );

    const snapshot = parseSnapshot(readFileSync(args.revertFile ?? '', 'utf8'));

    console.log(`${header} · REVERT ${args.revertFile}`);

    const { restored, skipped } = await revertSnapshot(
        raw(prisma),
        snapshot,
        args.force
    );

    for (const s of skipped)
        console.log(`⚠ ${snapshotKey(s.row)}: ${s.action}`);

    const current = await currentTexts(raw(prisma), snapshot.rows);

    const present = snapshot.rows.filter((r) => current.has(snapshotKey(r)));

    const matched = present.filter(
        (r) => current.get(snapshotKey(r)) === r.before
    ).length;

    console.log(
        `відновлено ${restored} · побайтово ${matched}/${present.length}`
    );

    if (matched !== present.length) process.exitCode = 1;
}

async function apply(
    prisma: Db,
    args: CliArgs,
    host: string,
    database: string,
    result: Awaited<ReturnType<typeof plan>>
) {
    const { applyPlans } = await import(
        '@/scripts/db/lib/backfill-rule-system-db'
    );

    const now = new Date();

    const file = join(args.snapshotDir, snapshotFileName(host, database, now));

    const rows = await applyPlans(raw(prisma), result.plans, (written) => {
        const snapshot: RuleSystemSnapshot = {
            version: 1,
            createdAt: now.toISOString(),
            host,
            database,
            rows: written,
        };

        mkdirSync(args.snapshotDir, { recursive: true });
        writeFileSync(file, JSON.stringify(snapshot, null, 2));
    });

    return { rows, file: rows.length > 0 ? file : null };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const host = assertSeedTarget(process.env.DATABASE_URL, args.allowRemote);

    const database = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);

    const { prisma } = await import('@/lib/db');

    try {
        const where = `${host}/${database}`;

        if (args.mode === 'revert') {
            await revert(prisma, args, `БД: ${where}`);

            return;
        }

        const result = await plan(prisma, args);

        const counts = (table: string) =>
            result.rows.filter((r) => r.table === table).length;

        const header = `БД: ${where} · ${args.mode === 'apply' ? 'APPLY' : 'DRY RUN'} · campaigns ${counts('campaigns')} · battle_scenes ${counts('battle_scenes')}`;

        const applied =
            args.mode === 'apply'
                ? await apply(prisma, args, host, database, result)
                : null;

        if (args.json) {
            console.log(
                JSON.stringify(
                    {
                        summary: result.summary,
                        plans: result.plans,
                        snapshot: applied?.file ?? null,
                    },
                    null,
                    2
                )
            );

            return;
        }

        printReport(header, result);

        if (applied)
            console.log(
                applied.file
                    ? `записано ${applied.rows.length} · знімок: ${applied.file}`
                    : 'нічого записувати'
            );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'помилка');
    process.exitCode = 1;
});
