#!/usr/bin/env tsx
/**
 * Inserts missing `skill_tree_progress` rows from the legacy `characters.skillTreeProgress` column (version 1, ON CONFLICT DO NOTHING). Existing rows are never touched; diverging ones are listed.
 * Dry run by default; --apply saves a snapshot of the inserted ids; --revert deletes exactly those rows while they are still at version 1 with the inserted bytes (--force skips the check).
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/backfill-skill-tree-progress.ts [--apply | --revert <file> | --report [--expect-zero]] [--allow-remote] [--json] [--snapshot-dir <dir>] [--force]
 */
import { Prisma } from '@prisma/client';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { isRecord } from '@/lib/utils/common/is-record';
import {
    extSnapshotFileName,
    parseExtArgs,
} from '@/scripts/db/lib/backfill-ext-common';
import {
    EXT_BATCH_SIZE,
    EXT_TX_OPTIONS,
} from '@/scripts/db/lib/backfill-ext-db';
import {
    formatProgressPlan,
    planProgressRevert,
    planSkillTreeProgress,
    type ProgressSnapshot,
    type ProgressSnapshotRow,
    type ProgressSourceRow,
    type ProgressTableRow,
    summarizeProgress,
} from '@/scripts/db/lib/backfill-skill-tree-progress-plan';
import type { RawDb } from '@/scripts/db/lib/raw-db';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const KIND = 'skill-tree-progress';

const writeSnapshot = (file: string, snapshot: ProgressSnapshot) => {
    const temporary = `${file}.tmp-${process.pid}`;

    writeFileSync(temporary, JSON.stringify(snapshot, null, 2));
    renameSync(temporary, file);
};

function parseSnapshot(text: string): ProgressSnapshot {
    const data: unknown = JSON.parse(text);

    if (
        !isRecord(data) ||
        data.version !== 1 ||
        data.kind !== KIND ||
        !Array.isArray(data.rows) ||
        !data.rows.every(
            (r) =>
                isRecord(r) &&
                typeof r.characterId === 'string' &&
                typeof r.progressText === 'string'
        )
    )
        throw new Error(`Invalid ${KIND} snapshot file`);

    return data as unknown as ProgressSnapshot;
}

const loadSources = (db: RawDb) =>
    db.$queryRaw<ProgressSourceRow[]>(
        Prisma.sql`SELECT id AS "characterId", "skillTreeProgress"::text AS "columnText" FROM characters ORDER BY id`
    );

const loadTable = (db: RawDb, ids?: readonly string[]) =>
    db.$queryRaw<ProgressTableRow[]>(
        ids
            ? Prisma.sql`SELECT character_id AS "characterId", progress::text AS "progressText", version FROM skill_tree_progress WHERE character_id = ANY(${ids}::text[])`
            : Prisma.sql`SELECT character_id AS "characterId", progress::text AS "progressText", version FROM skill_tree_progress`
    );

async function revert(db: RawDb, file: string, force: boolean, where: string) {
    const snapshot = parseSnapshot(readFileSync(file, 'utf8'));

    const ids = snapshot.rows.map((r) => r.characterId);

    const result = await db.$transaction(async (tx) => {
        const current = new Map(
            (await loadTable(tx, ids)).map((r) => [r.characterId, r])
        );

        const actions = planProgressRevert(snapshot, current);

        const conflicts = actions.filter((a) => a.action === 'conflict');

        if (conflicts.length > 0 && !force)
            throw new Error(
                `Conflict: ${conflicts.map((c) => c.row.characterId).join(', ')} changed after apply (--force only by owner decision)`
            );

        let deleted = 0;

        for (const { row, action } of actions) {
            if (action === 'missing') continue;

            const rows = await tx.$queryRaw<{ id: string }[]>(
                force
                    ? Prisma.sql`DELETE FROM skill_tree_progress WHERE character_id = ${row.characterId} RETURNING character_id AS id`
                    : Prisma.sql`DELETE FROM skill_tree_progress WHERE character_id = ${row.characterId} AND version = 1 AND progress::text = ${current.get(row.characterId)?.progressText ?? ''} RETURNING character_id AS id`
            );

            if (rows.length === 0)
                throw new Error(
                    `${row.characterId}: row changed since it was read`
                );

            deleted += rows.length;
        }

        return {
            deleted,
            missing: actions.filter((a) => a.action === 'missing').length,
        };
    }, EXT_TX_OPTIONS);

    console.log(
        `${where} · REVERT · deleted ${result.deleted} · already missing ${result.missing}`
    );
}

async function main() {
    const args = parseExtArgs(process.argv.slice(2));

    const host = assertSeedTarget(process.env.DATABASE_URL, args.allowRemote);

    const database = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);

    const { prisma } = await import('@/lib/db');

    const db = prisma as unknown as RawDb;

    try {
        const where = `DB: ${host}/${database}`;

        if (args.mode === 'revert')
            return await revert(db, args.revertFile ?? '', args.force, where);

        const plans = planSkillTreeProgress(
            await loadSources(db),
            await loadTable(db)
        );

        const summary = summarizeProgress(plans);

        if (args.mode === 'report') {
            console.log(
                args.json
                    ? JSON.stringify(summary)
                    : `${where} · missing ${summary.insert} · present ${summary.present} · empty ${summary.empty} · divergent ${summary.divergent}`
            );

            if (args.expectZero && summary.insert > 0) process.exitCode = 1;

            return;
        }

        let file: string | null = null;

        let inserted = 0;

        if (args.mode === 'apply') {
            const targets = plans.filter((p) => p.action === 'insert');

            const now = new Date();

            const target = join(
                args.snapshotDir,
                extSnapshotFileName(KIND, host, database, now)
            );

            const done: ProgressSnapshotRow[] = [];

            const save = () =>
                writeSnapshot(target, {
                    version: 1,
                    kind: KIND,
                    createdAt: now.toISOString(),
                    host,
                    database,
                    rows: done,
                });

            if (targets.length > 0)
                mkdirSync(args.snapshotDir, { recursive: true });

            for (let i = 0; i < targets.length; i += EXT_BATCH_SIZE) {
                const batch = targets.slice(i, i + EXT_BATCH_SIZE);

                const out = await db.$transaction(async (tx) => {
                    const rowsDone: ProgressSnapshotRow[] = [];

                    for (const p of batch) {
                        const rows = await tx.$queryRaw<
                            { characterId: string; progressText: string }[]
                        >(
                            Prisma.sql`INSERT INTO skill_tree_progress (character_id, progress, version, updated_at) VALUES (${p.characterId}, ${p.progressText}::jsonb, 1, now()) ON CONFLICT (character_id) DO NOTHING RETURNING character_id AS "characterId", progress::text AS "progressText"`
                        );

                        rowsDone.push(...rows);
                    }

                    return rowsDone;
                }, EXT_TX_OPTIONS);

                done.push(...out);

                save();
            }

            inserted = done.length;

            file = done.length > 0 ? target : null;
        }

        if (args.json) {
            console.log(JSON.stringify({ summary, snapshot: file }, null, 2));

            return;
        }

        console.log(
            `${where} · ${args.mode === 'apply' ? 'APPLY' : 'DRY RUN'} · characters ${plans.length}`
        );

        for (const p of plans)
            for (const line of formatProgressPlan(p)) console.log(line);

        console.log(
            `summary: insert ${summary.insert} · present ${summary.present} · empty ${summary.empty} · skipped ${summary.skipped} (divergent ${summary.divergent})`
        );

        if (args.mode === 'apply')
            console.log(
                file
                    ? `inserted ${inserted} · snapshot: ${file}`
                    : 'nothing to insert'
            );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'error');
    process.exitCode = 1;
});
