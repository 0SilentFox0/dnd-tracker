#!/usr/bin/env tsx
/**
 * Moves participant state from the system slot back to the flat legacy fields (battle_participants and the undo history),
 * so a previously deployed build can read the battles. Dry-run by default; --apply is one transaction with an optimistic
 * lock (scene version is bumped, rows are matched by their stored text) and writes a before/after file for audit.
 * No --revert: the current code reads the legacy form too. Re-running is idempotent.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/battle-state-downgrade.ts [--apply] [--allow-remote] [--status all|active] [--scene <id,…>] [--snapshot-dir <dir>] [--force] [--json]
 */
import { join } from 'node:path';

import type { RawDb } from '@/scripts/db/lib/battle-state-db';
import { withSnapshotFile } from '@/scripts/db/lib/battle-state-file';
import {
    type DowngradeSnapshot,
    type DowngradeSnapshotBody,
    formatPlan,
    parseDowngradeArgs,
    planDowngrade,
    snapshotFileName,
} from '@/scripts/db/lib/battle-state-plan';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

async function main() {
    const args = parseDowngradeArgs(process.argv.slice(2));

    const host = assertSeedTarget(process.env.DATABASE_URL, args.allowRemote);

    const database = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);

    const { applyDowngrade, loadHistory, loadParticipants, loadScenes } =
        await import('@/scripts/db/lib/battle-state-db');

    const { prisma } = await import('@/lib/db');

    try {
        const db = prisma as unknown as RawDb;

        const scenes = await loadScenes(db, {
            status: args.status,
            sceneIds: args.sceneIds,
        });

        const ids = scenes.map((s) => s.id);

        const plan = planDowngrade(
            scenes,
            await loadParticipants(db, ids),
            await loadHistory(db, ids)
        );

        if (args.apply && plan.unmapped.length > 0 && !args.force) {
            for (const line of formatPlan(plan)) console.log(line);

            throw new Error(
                'Є unmapped поля: запис скасовано (--force лише за рішенням власника)'
            );
        }

        const now = new Date();

        const file = join(
            args.snapshotDir,
            snapshotFileName(host, database, now)
        );

        const applied =
            args.apply && plan.scenes.length > 0
                ? await withSnapshotFile(
                      file,
                      (body: DowngradeSnapshotBody): DowngradeSnapshot => ({
                          version: 1,
                          createdAt: now.toISOString(),
                          host,
                          database,
                          ...body,
                      }),
                      (write) => applyDowngrade(db, plan, write)
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
