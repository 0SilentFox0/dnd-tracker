#!/usr/bin/env tsx
/**
 * Moves the flat legacy participant fields (battle_participants and the undo history) into the system slot of the
 * scene's base system. Dry-run by default; --apply is one transaction with an optimistic lock (scene version is bumped,
 * rows are matched by their stored text) and writes a before/after file. --revert <file> puts `before` back where the
 * stored text still equals `after`. Re-running is idempotent.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/battle-state-forward.ts [--apply | --revert <file>] [--allow-remote] [--status all|active] [--scene <id,…>] [--snapshot-dir <dir>] [--force] [--json]
 */
import { join } from 'node:path';

import type { RawDb } from '@/scripts/db/lib/battle-state-db';
import {
    readSnapshotFile,
    withSnapshotFile,
} from '@/scripts/db/lib/battle-state-file';
import {
    formatPlan,
    parseForwardArgs,
    planForward,
    snapshotFileName,
    type StateSnapshot,
    type StateSnapshotBody,
} from '@/scripts/db/lib/battle-state-plan';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

async function main() {
    const args = parseForwardArgs(process.argv.slice(2));

    const host = assertSeedTarget(process.env.DATABASE_URL, args.allowRemote);

    const database = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);

    const {
        applyStatePlan,
        loadHistory,
        loadParticipants,
        loadScenes,
        revertStatePlan,
    } = await import('@/scripts/db/lib/battle-state-db');

    const { prisma } = await import('@/lib/db');

    try {
        const db = prisma as unknown as RawDb;

        if (args.revertFile) {
            const reverted = await revertStatePlan(
                db,
                readSnapshotFile(args.revertFile)
            );

            console.log(
                `БД: ${host}/${database} · REVERT · сцен ${reverted.scenes} · учасників ${reverted.participants} · рядків історії ${reverted.history}`
            );

            return;
        }

        const scenes = await loadScenes(db, {
            status: args.status,
            sceneIds: args.sceneIds,
        });

        const ids = scenes.map((s) => s.id);

        const plan = planForward(
            scenes,
            await loadParticipants(db, ids),
            await loadHistory(db, ids)
        );

        const blocked = plan.unmapped.length > 0 || plan.unresolved.length > 0;

        if (args.apply && blocked && !args.force) {
            for (const line of formatPlan(plan)) console.log(line);

            throw new Error(
                'Є unmapped поля або сцени без бази: запис скасовано (--force лише за рішенням власника)'
            );
        }

        const now = new Date();

        const file = join(
            args.snapshotDir,
            snapshotFileName(host, database, now, '-forward')
        );

        const applied =
            args.apply && plan.scenes.length > 0
                ? await withSnapshotFile(
                      file,
                      (body: StateSnapshotBody): StateSnapshot => ({
                          version: 1,
                          createdAt: now.toISOString(),
                          host,
                          database,
                          ...body,
                      }),
                      (write) => applyStatePlan(db, plan, write)
                  )
                : null;

        if (args.json) {
            console.log(
                JSON.stringify(
                    {
                        mode: args.apply ? 'apply' : 'dry-run',
                        scenes: plan.scenes,
                        participants: plan.participants.length,
                        history: plan.history.length,
                        unmapped: plan.unmapped,
                        unresolved: plan.unresolved,
                        snapshot: applied ? file : null,
                    },
                    null,
                    2
                )
            );

            return;
        }

        console.log(
            `БД: ${host}/${database} · ${args.apply ? 'APPLY' : 'DRY RUN'} · статус ${args.status}`
        );

        for (const line of formatPlan(plan)) console.log(line);

        if (args.apply)
            console.log(
                applied ? `записано · знімок: ${file}` : 'нічого записувати'
            );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'помилка');
    process.exitCode = 1;
});
