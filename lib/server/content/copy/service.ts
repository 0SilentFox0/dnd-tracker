import { applyCopyPlan, copyRowRef } from './apply';
import { buildCopyPlan } from './plan';
import { resolveTargets } from './targets';

import 'server-only';
import { prisma } from '@/lib/db';
import { assertCan } from '@/lib/server/content/access';
import { exportCampaign } from '@/lib/server/templates/export-campaign';
import { type Actor, sessionDmActor } from '@/lib/utils/api/actor';
import { NEED } from '@/lib/utils/api/need';
import type {
    CopyItem,
    CopyResult,
    CopyTargetReport,
    CopyTargets,
} from '@/types/content-copy';

export async function copyContent(args: {
    actor: Actor;
    items: CopyItem[];
    targets: CopyTargets;
    dryRun?: boolean;
}): Promise<CopyResult> {
    const { actor, items, dryRun } = args;

    assertCan(actor, NEED.write);

    const source = await exportCampaign(prisma, actor.campaignId);

    const targets = await resolveTargets({
        userId: actor.userId,
        sourceCampaignId: actor.campaignId,
        targets: args.targets,
    });

    const reports: CopyTargetReport[] = [];

    for (const target of targets) {
        const report: CopyTargetReport = {
            campaignId: target.id,
            name: target.name,
            status: 'ok',
            created: [],
            reused: [],
            skipped: [],
        };

        try {
            const plan = await buildCopyPlan({
                source,
                target: await exportCampaign(prisma, target.id),
                targetActor: sessionDmActor(target.id, actor.userId),
                selected: items,
            });

            report.reused = plan.reused;
            report.skipped = plan.skipped;

            report.created = dryRun
                ? plan.toCreate.map(({ table, row }) =>
                      copyRowRef(table, row, row.id)
                  )
                : await applyCopyPlan(target.id, plan);

            if (plan.skipped.length > 0) report.status = 'partial';
        } catch (error) {
            report.status = 'failed';
            report.created = [];
            report.error =
                error instanceof Error ? error.message : String(error);
        }

        reports.push(report);
    }

    return { targets: reports };
}
