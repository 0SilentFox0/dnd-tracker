#!/usr/bin/env tsx
/**
 * Copies the legacy `morale` column into `characteristics.ext.morale.value` for one table (--table characters|units|units_base). The column is never touched.
 * HASH GUARD (--expect-same-hashes, on by default): contentRowHash legacy == migrated for every row, otherwise nothing is written.
 * Dry run by default; --apply refuses while any affected campaign has an active battle, writes with a compare-and-swap on the stored text + column value, and saves a byte-exact snapshot for --revert.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/backfill-morale-ext.ts --table <t> [--apply | --report [--expect-zero]] [--allow-remote] [--json] [--snapshot-dir <dir>] [--no-expect-same-hashes]
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/backfill-morale-ext.ts --revert <file> [--force] [--allow-remote]
 */
import { Prisma } from '@prisma/client';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import '@/lib/utils/rules/systems/registry';
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
    activeBattleCampaigns,
    currentTexts,
    EXT_BATCH_SIZE,
    EXT_TX_OPTIONS,
    revertExtSnapshot,
    tableSql,
    writeCharacteristicsCas,
} from '@/scripts/db/lib/backfill-ext-db';
import {
    assertSameMoraleHashes,
    formatMoralePlan,
    MORALE_TABLES,
    type MoraleBackfillRow,
    type MoraleTable,
    pendingMorale,
    planMorale,
    summarizeMorale,
} from '@/scripts/db/lib/backfill-morale-ext-plan';
import type { RawDb } from '@/scripts/db/lib/raw-db';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const KIND = 'morale-ext';

async function load(
    db: RawDb,
    table: MoraleTable
): Promise<MoraleBackfillRow[]> {
    const isBase = table === 'units_base';

    const owner = Prisma.raw(isBase ? '"sourceCampaignId"' : '"campaignId"');

    const validFrom = isBase
        ? Prisma.raw('"validFrom"')
        : Prisma.raw('NULL::int');

    const rows = await db.$queryRaw<
        {
            id: string;
            validFrom: number | null;
            owner: string;
            morale: number;
            text: string;
        }[]
    >(
        Prisma.sql`SELECT id, ${validFrom} AS "validFrom", ${owner} AS owner, morale, characteristics::text AS text FROM ${tableSql(table)} ORDER BY id`
    );

    return rows.map((r) => ({
        table,
        id: r.id,
        validFrom: r.validFrom ?? undefined,
        campaignId: r.owner,
        morale: Number(r.morale),
        characteristicsText: r.text,
    }));
}

async function main() {
    const args = parseExtArgs(process.argv.slice(2), MORALE_TABLES);

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

        const table = args.table as MoraleTable;

        const rows = await load(db, table);

        if (args.mode === 'report') {
            const pending = pendingMorale(rows);

            console.log(
                args.json
                    ? JSON.stringify({ table, rows: rows.length, pending })
                    : `${where} · ${table}: rows ${rows.length} · without ext.morale.value ${pending}`
            );

            if (args.expectZero && pending > 0) process.exitCode = 1;

            return;
        }

        const plans = planMorale(rows);

        if (args.expectSameHashes) assertSameMoraleHashes(plans);

        const active = await activeBattleCampaigns(db);

        const summary = summarizeMorale(plans, active);

        if (args.mode === 'apply' && summary.activeBattle > 0)
            throw new Error(
                `Rows in campaigns with active battles (${summary.activeBattle}): finish the battles first`
            );

        let file: string | null = null;

        let written = 0;

        if (args.mode === 'apply') {
            const targets = plans.filter((p) => p.action === 'write');

            const now = new Date();

            const target = join(
                args.snapshotDir,
                extSnapshotFileName(`${KIND}-${table}`, host, database, now)
            );

            const planned: ExtSnapshotRow[] = targets.map((p) => ({
                table,
                id: p.row.id,
                ...(p.row.validFrom === undefined
                    ? {}
                    : { validFrom: p.row.validFrom }),
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
                        const { id, validFrom } = p.row;

                        const after = await writeCharacteristicsCas(
                            tx,
                            { table, id, validFrom },
                            p.afterText ?? '',
                            p.row.characteristicsText,
                            Prisma.sql`morale = ${p.row.morale}`
                        );

                        if (after === undefined)
                            throw new Error(
                                `${extRowKey({ table, id, validFrom })}: row changed since it was read`
                            );

                        rowsDone.push({
                            table,
                            id,
                            ...(validFrom === undefined ? {} : { validFrom }),
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
            `${where} · ${table} · ${args.mode === 'apply' ? 'APPLY' : 'DRY RUN'} · rows ${rows.length}`
        );

        for (const p of plans)
            for (const line of formatMoralePlan(p)) console.log(line);

        console.log(
            `summary: write ${summary.write} (active-battle campaigns ${summary.activeBattle}) · unchanged ${summary.unchanged} · skipped ${summary.skipped} · divergent ${summary.divergent} · hash mismatches ${summary.hashMismatches}`
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
