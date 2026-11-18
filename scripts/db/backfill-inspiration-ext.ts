#!/usr/bin/env tsx
/**
 * Copies `characters.inspiration = true` into `characteristics.ext.inspiration.available` for rows that lack it. The column is never touched.
 * Dry run by default; --apply writes in batches (one transaction each) with a compare-and-swap on `updatedAt` + stored text and a byte-exact snapshot for --revert.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/backfill-inspiration-ext.ts [--apply | --revert <file> | --report [--expect-zero]] [--allow-remote] [--json] [--snapshot-dir <dir>] [--force]
 */
import { Prisma } from '@prisma/client';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    extRowKey,
    type ExtSnapshot,
    extSnapshotFileName,
    type ExtSnapshotRow,
    parseExtArgs,
    parseExtSnapshot,
    writeSnapshotAtomically,
} from '@/scripts/db/lib/backfill-ext-common';
import {
    currentTexts,
    EXT_BATCH_SIZE,
    EXT_TX_OPTIONS,
    revertExtSnapshot,
    writeCharacteristicsCas,
} from '@/scripts/db/lib/backfill-ext-db';
import {
    formatInspirationPlan,
    type InspirationBackfillRow,
    planInspiration,
    summarizeInspiration,
} from '@/scripts/db/lib/backfill-inspiration-ext-plan';
import type { RawDb } from '@/scripts/db/lib/raw-db';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const KIND = 'inspiration-ext';

async function load(db: RawDb): Promise<InspirationBackfillRow[]> {
    const rows = await db.$queryRaw<
        {
            id: string;
            campaignId: string;
            inspiration: boolean;
            updatedAt: string;
            text: string;
        }[]
    >(
        Prisma.sql`SELECT id, "campaignId", inspiration, "updatedAt"::text AS "updatedAt", characteristics::text AS text FROM characters WHERE inspiration = true ORDER BY id`
    );

    return rows.map((r) => ({
        id: r.id,
        campaignId: r.campaignId,
        inspiration: r.inspiration,
        updatedAt: r.updatedAt,
        characteristicsText: r.text,
    }));
}

async function main() {
    const args = parseExtArgs(process.argv.slice(2));

    const host = assertSeedTarget(process.env.DATABASE_URL, args.allowRemote);

    const database = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);

    const { prisma } = await import('@/lib/db');

    const db = prisma as unknown as RawDb;

    try {
        const where = `DB: ${host}/${database}`;

        if (args.mode === 'revert') {
            const snapshot = parseExtSnapshot(
                readFileSync(args.revertFile ?? '', 'utf8'),
                KIND
            );

            const { restored, skipped } = await revertExtSnapshot(
                db,
                snapshot,
                args.force
            );

            for (const s of skipped)
                console.log(`warning ${extRowKey(s.row)}: ${s.action}`);

            const current = await currentTexts(db, snapshot.rows);

            const present = snapshot.rows.filter((r) =>
                current.has(extRowKey(r))
            );

            const matched = present.filter(
                (r) => current.get(extRowKey(r)) === r.before
            ).length;

            console.log(
                `${where} · REVERT · restored ${restored} · byte-exact ${matched}/${present.length}`
            );

            if (matched !== present.length) process.exitCode = 1;

            return;
        }

        const rows = await load(db);

        const plans = planInspiration(rows);

        const summary = summarizeInspiration(plans);

        if (args.mode === 'report') {
            console.log(
                args.json
                    ? JSON.stringify(summary)
                    : `${where} · rows with inspiration=true ${rows.length} · missing ext ${summary.write} · skipped ${summary.skipped}`
            );

            if (args.expectZero && summary.write > 0) process.exitCode = 1;

            return;
        }

        let file: string | null = null;

        let written = 0;

        if (args.mode === 'apply') {
            const targets = plans.filter((p) => p.action === 'write');

            const now = new Date();

            const target = join(
                args.snapshotDir,
                extSnapshotFileName(KIND, host, database, now)
            );

            const planned: ExtSnapshotRow[] = targets.map((p) => ({
                table: 'characters',
                id: p.row.id,
                before: p.row.characteristicsText,
                after: p.afterText ?? '',
            }));

            const save = (done: ExtSnapshotRow[]) => {
                const doneKeys = new Map(done.map((r) => [extRowKey(r), r]));

                const snapshot: ExtSnapshot = {
                    version: 1,
                    kind: KIND,
                    createdAt: now.toISOString(),
                    host,
                    database,
                    rows: planned.map((r) => doneKeys.get(extRowKey(r)) ?? r),
                };

                writeSnapshotAtomically(target, snapshot);
            };

            if (planned.length > 0) {
                mkdirSync(args.snapshotDir, { recursive: true });
                save([]);
            }

            const done: ExtSnapshotRow[] = [];

            for (let i = 0; i < targets.length; i += EXT_BATCH_SIZE) {
                const batch = targets.slice(i, i + EXT_BATCH_SIZE);

                const out = await db.$transaction(async (tx) => {
                    const rowsDone: ExtSnapshotRow[] = [];

                    for (const p of batch) {
                        const after = await writeCharacteristicsCas(
                            tx,
                            { table: 'characters', id: p.row.id },
                            p.afterText ?? '',
                            p.row.characteristicsText,
                            Prisma.sql`"updatedAt"::text = ${p.row.updatedAt}`
                        );

                        if (after === undefined)
                            throw new Error(
                                `characters:${p.row.id}: row changed since it was read`
                            );

                        rowsDone.push({
                            table: 'characters',
                            id: p.row.id,
                            before: p.row.characteristicsText,
                            after,
                        });
                    }

                    return rowsDone;
                }, EXT_TX_OPTIONS);

                done.push(...out);

                save(done);
            }

            written = done.length;

            file = done.length > 0 ? target : null;
        }

        if (args.json) {
            console.log(JSON.stringify({ summary, snapshot: file }, null, 2));

            return;
        }

        console.log(
            `${where} · ${args.mode === 'apply' ? 'APPLY' : 'DRY RUN'} · rows ${rows.length}`
        );

        for (const p of plans)
            for (const line of formatInspirationPlan(p)) console.log(line);

        console.log(
            `summary: write ${summary.write} · unchanged ${summary.unchanged} · skipped ${summary.skipped}`
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
