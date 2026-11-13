#!/usr/bin/env tsx
/**
 * One-off: completes battle scenes with status "active" through the app's own `complete` operation
 * (same guards, result, log, XP, snapshots as the DM's button), one campaign-locked transaction per scene.
 * "prepared" scenes are never touched. Pusher is not published to; only the show pointer is cleared.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/end-active-battles.ts [--apply] [--allow-remote] [--scene <id,…>] [--campaign <id|name,…>]
 *   Without --apply it only reports (dry-run). Apply first writes a JSON state snapshot to .migration-backup/end-battles/.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { prisma } from '@/lib/db';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getBattleOperation } from '@/lib/server/battles/operations';
import { withCampaignRuntimeWrite } from '@/lib/server/content/write';
import { createScopedDatabase } from '@/lib/server/content/write-context';
import { clearShowBattle } from '@/lib/server/show/show-store';
import type { PipelineDeps } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { runGuardedBattleOperationCore } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import {
    loadBattle,
    loadBattleAccess,
    loadRecentEvents,
    saveBattle,
} from '@/lib/utils/battle/store';
import {
    type ActiveSceneRow,
    endScenes,
    formatScene,
    missingSceneIds,
    parseArgs,
    selectScenes,
    snapshotFileName,
    summarize,
} from '@/scripts/db/lib/end-battles-plan';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

async function loadActive(): Promise<ActiveSceneRow[]> {
    const rows = await prisma.battleScene.findMany({
        where: { status: 'active' },
        orderBy: [{ campaignId: 'asc' }, { createdAt: 'asc' }],
        select: {
            id: true,
            name: true,
            status: true,
            currentRound: true,
            currentTurnIndex: true,
            version: true,
            eventSeq: true,
            campaign: { select: { id: true, name: true, dmUserId: true } },
            battleParticipants: { select: { isPending: true } },
        },
    });

    return rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        round: r.currentRound,
        turnIndex: r.currentTurnIndex,
        version: r.version,
        eventSeq: r.eventSeq,
        campaignId: r.campaign.id,
        campaignName: r.campaign.name,
        dmUserId: r.campaign.dmUserId,
        participants: r.battleParticipants.filter((p) => !p.isPending).length,
        pending: r.battleParticipants.filter((p) => p.isPending).length,
    }));
}

async function writeSnapshot(
    host: string,
    scenes: ActiveSceneRow[]
): Promise<string> {
    const full = await prisma.battleScene.findMany({
        where: { id: { in: scenes.map((s) => s.id) } },
        include: { battleParticipants: true, battleSnapshots: true },
    });

    const dir = join(process.cwd(), '.migration-backup', 'end-battles');

    mkdirSync(dir, { recursive: true });

    const file = join(dir, snapshotFileName(host, new Date()));

    writeFileSync(
        file,
        JSON.stringify(
            { version: 1, createdAt: new Date().toISOString(), host, full },
            null,
            2
        )
    );

    return file;
}

function depsFor(tx: Parameters<typeof createScopedDatabase>[0]): PipelineDeps {
    const db = createScopedDatabase(tx) as unknown as Parameters<
        typeof loadBattle
    >[0];

    return {
        getUserId: async () => null,
        rateLimit: async () => ({
            allowed: true,
            count: 0,
            limit: 1,
            retryAfterSeconds: 0,
        }),
        loadBattle: (args) => loadBattle(db, args),
        recheckAccess: async (args) => {
            const a = await loadBattleAccess(db, args);

            return a && { isMember: a.isMember, isDM: a.isDM };
        },
        saveBattle: (before, outcome, write) =>
            saveBattle(db, before, outcome, write),
        loadRecentEvents: (battleId, limit) =>
            loadRecentEvents(db, battleId, limit),
        publish: () => undefined,
    };
}

async function endOne(scene: ActiveSceneRow): Promise<void> {
    const params = { id: scene.campaignId, battleId: scene.id };

    const options = {
        ...(await getBattleOperation('complete', params)),
        params,
    };

    await withCampaignRuntimeWrite(scene.campaignId, (tx) =>
        runGuardedBattleOperationCore(
            scene.dmUserId,
            {},
            scene.version,
            options,
            depsFor(tx),
            { logLocale: DEFAULT_LOCALE }
        )
    );

    await clearShowBattle(scene.campaignId, scene.id);
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const host = assertSeedTarget(process.env.DATABASE_URL, args.allowRemote);

    console.log(`БД: ${host}${args.apply ? '' : ' · DRY RUN'}`);

    const all = await loadActive();

    const scenes = selectScenes(all, args);

    const missing = missingSceneIds(scenes, args);

    if (missing.length)
        throw new Error(`Не знайдено активних сцен: ${missing.join(', ')}`);

    console.log(`активних сцен у БД ${all.length}, обрано ${scenes.length}`);

    for (const s of scenes) console.log(`  ${formatScene(s)}`);

    if (!scenes.length || !args.apply) return;

    console.log(`знімок: ${await writeSnapshot(host, scenes)}`);

    const outcomes = await endScenes(scenes, endOne);

    for (const o of outcomes)
        console.log(`  ${o.id}: ${o.ok ? 'ok' : `ПОМИЛКА ${o.error}`}`);

    console.log(summarize(outcomes));

    if (outcomes.some((o) => !o.ok)) process.exitCode = 1;
}

main()
    .catch((e) => {
        console.error(e);

        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
