#!/usr/bin/env tsx
/**
 * Moves the d20 statblock (9 columns) into `characteristics` for characters/units of d20 campaigns and units_base rows of d20 layers.
 * Default is a dry run; --apply writes in batches of 500 (one transaction each) with a byte-exact snapshot for --revert. Columns are never touched.
 * HASH GUARD (on by default): contentRowHash before == after for every row, otherwise nothing is written.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/backfill-d20-characteristics.ts [--apply | --revert <file> | --report [--expect-zero]] [--allow-remote] [--json] [--snapshot-dir <dir>] [--expect-same-hashes | --no-expect-same-hashes] [--force] [--allow-active-battles]
 * --apply refuses when affected rows belong to campaigns with active battles unless --allow-active-battles is given.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import '@/lib/utils/rules/systems/registry';
import {
    assertSameHashes,
    formatPlan,
    planAll,
    reportRows,
    summarizePlans,
} from '@/scripts/db/lib/backfill-d20-characteristics-plan';
import {
    assertNoActiveBattles,
    type CharacteristicsSnapshot,
    type CliArgs,
    parseArgs,
    parseSnapshot,
    snapshotFileName,
    snapshotKey,
} from '@/scripts/db/lib/backfill-d20-characteristics-snapshot';
import type { RawDb } from '@/scripts/db/lib/raw-db';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

async function load(db: RawDb) {
    const { loadCampaignFacts, loadStatRows } = await import(
        '@/scripts/db/lib/backfill-d20-characteristics-db'
    );

    return loadStatRows(db, await loadCampaignFacts(db));
}

async function revert(db: RawDb, args: CliArgs, header: string) {
    const { currentTexts, revertSnapshot } = await import(
        '@/scripts/db/lib/backfill-d20-characteristics-db'
    );

    const snapshot = parseSnapshot(readFileSync(args.revertFile ?? '', 'utf8'));

    console.log(`${header} · REVERT ${args.revertFile}`);

    const { restored, skipped } = await revertSnapshot(
        db,
        snapshot,
        args.force
    );

    for (const s of skipped)
        console.log(`warning ${snapshotKey(s.row)}: ${s.action}`);

    const current = await currentTexts(db, snapshot.rows);

    const present = snapshot.rows.filter((r) => current.has(snapshotKey(r)));

    const matched = present.filter(
        (r) => current.get(snapshotKey(r)) === r.before
    ).length;

    console.log(
        `restored ${restored} · byte-exact ${matched}/${present.length}`
    );

    if (matched !== present.length) process.exitCode = 1;
}

async function report(db: RawDb, args: CliArgs, header: string) {
    const result = reportRows(await load(db));

    if (args.json) console.log(JSON.stringify(result, null, 2));
    else {
        console.log(header);

        for (const [table, c] of Object.entries(result.tables))
            console.log(
                `${table}: rows ${c.rows} · columns != characteristics ${c.mismatched}`
            );

        console.log(`rows ${result.rows} · mismatched ${result.mismatched}`);
    }

    if (args.expectZero && result.mismatched > 0) process.exitCode = 1;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const host = assertSeedTarget(process.env.DATABASE_URL, args.allowRemote);

    const database = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);

    const { prisma } = await import('@/lib/db');

    const db = prisma as unknown as RawDb;

    try {
        const where = `DB: ${host}/${database}`;

        if (args.mode === 'revert') return await revert(db, args, where);

        if (args.mode === 'report') return await report(db, args, where);

        const rows = await load(db);

        const plans = planAll(rows);

        const summary = summarizePlans(plans);

        if (args.expectSameHashes) assertSameHashes(plans);

        if (args.mode === 'apply')
            assertNoActiveBattles(summary.activeBattle, args);

        let file: string | null = null;

        let written = 0;

        if (args.mode === 'apply') {
            const { applyPlans } = await import(
                '@/scripts/db/lib/backfill-d20-characteristics-db'
            );

            const now = new Date();

            const target = join(
                args.snapshotDir,
                snapshotFileName(host, database, now)
            );

            const done = await applyPlans(db, plans, (rowsDone) => {
                const snapshot: CharacteristicsSnapshot = {
                    version: 1,
                    createdAt: now.toISOString(),
                    host,
                    database,
                    rows: rowsDone,
                };

                mkdirSync(args.snapshotDir, { recursive: true });
                writeFileSync(target, JSON.stringify(snapshot, null, 2));
            });

            written = done.length;

            file = done.length > 0 ? target : null;
        }

        if (args.json) {
            console.log(
                JSON.stringify({ summary, plans, snapshot: file }, null, 2)
            );

            return;
        }

        console.log(
            `${where} · ${args.mode === 'apply' ? 'APPLY' : 'DRY RUN'} · rows ${rows.length}`
        );

        for (const p of plans)
            for (const line of formatPlan(p)) console.log(line);

        const { byTable, skipped } = summary;

        console.log(
            `summary: write ${summary.write} (characters ${byTable.characters}, units ${byTable.units}, units_base ${byTable.units_base}; active-battle campaigns ${summary.activeBattle}) · unchanged ${summary.unchanged} · skipped ${skipped.notObject} · hash mismatches ${summary.hashMismatches}`
        );

        if (args.mode === 'apply')
            console.log(
                file
                    ? `written ${written} · snapshot: ${file}`
                    : 'nothing to write'
            );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'error');
    process.exitCode = 1;
});
