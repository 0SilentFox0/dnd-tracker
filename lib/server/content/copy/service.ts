import { applyCopyPlan, copyRowRef } from './apply';
import { copyMaps } from './maps';
import { buildCopyPlan } from './plan';
import { resolveTargets } from './targets';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import type { ContentKind } from '@/lib/constants/content-kinds';
import { prisma } from '@/lib/db';
import { assertCan } from '@/lib/server/content/access';
import { BundleInvalidError } from '@/lib/server/templates/bundle';
import { exportCampaign, exportNames } from '@/lib/server/templates/export-campaign';
import { type Actor, sessionDmActor } from '@/lib/utils/api/actor';
import { ContentError } from '@/lib/utils/api/content-error';
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

    const contentItems = items.filter(
        (item): item is CopyItem & { kind: ContentKind } => item.kind !== 'maps'
    );

    const mapIds = items.flatMap((item) =>
        item.kind === 'maps' ? item.ids : []
    );

    const source =
        contentItems.length > 0
            ? await exportCampaign(prisma, actor.campaignId, {
                  compendium: false,
              })
            : null;

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
            warnings: [],
        };

        try {
            if (source) {
                const plan = await buildCopyPlan({
                    source,
                    target: await exportNames(prisma, target.id),
                    targetActor: sessionDmActor(target.id, actor.userId),
                    selected: contentItems,
                });

                report.reused = plan.reused.map(({ kind, name }) => ({
                    kind,
                    name,
                }));
                report.skipped = plan.skipped;
                report.warnings = plan.warnings;

                report.created = dryRun
                    ? plan.toCreate.map(({ table, row }) =>
                          copyRowRef(table, row)
                      )
                    : await applyCopyPlan(target.id, plan);
            }

            if (mapIds.length > 0)
                try {
                    const maps = await copyMaps({
                        sourceCampaignId: actor.campaignId,
                        targetCampaignId: target.id,
                        ids: mapIds,
                        dryRun,
                    });

                    report.created.push(
                        ...maps.created.map(({ id, name }) => ({
                            kind: 'maps',
                            ...(dryRun ? {} : { id }),
                            name,
                        }))
                    );
                    report.skipped.push(
                        ...maps.skipped.map((s) => ({ kind: 'maps', ...s }))
                    );
                } catch (error) {
                    console.error('copyMaps failed', target.id, error);
                    report.status = 'failed';
                    report.error = API_ERRORS.INTERNAL;
                    reports.push(report);

                    continue;
                }

            if (report.skipped.some((s) => s.reason !== 'exists'))
                report.status = 'partial';
        } catch (error) {
            report.status = 'failed';
            report.created = [];

            if (
                error instanceof ContentError ||
                error instanceof BundleInvalidError
            )
                report.error = error.message || API_ERRORS.BUNDLE_INVALID;
            else {
                console.error('copyContent failed', target.id, error);
                report.error = API_ERRORS.INTERNAL;
            }
        }

        reports.push(report);
    }

    return { targets: reports };
}
