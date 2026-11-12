import { prisma } from '@/lib/db';
import {
    BUNDLE_TABLES,
    delegateOf,
    type TemplateDb,
} from '@/lib/server/templates/bundle';
import { rowHash } from '@/lib/server/templates/sync/hash';

export interface CampaignSnapshot {
    contentVersion: number;
    hashes: Record<string, Record<string, string>>;
    slugs: Record<string, Record<string, unknown>>;
    maxUpdatedAt: Record<string, string | null>;
}

/** Content of a campaign per table: row id -> content hash (slug excluded), slugs and the newest `updatedAt`; compares an import before and after. */
export async function snapshotCampaign(
    campaignId: string
): Promise<CampaignSnapshot> {
    const campaign = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaignId },
        select: { contentVersion: true },
    });

    const snapshot: CampaignSnapshot = {
        contentVersion: campaign.contentVersion,
        hashes: {},
        slugs: {},
        maxUpdatedAt: {},
    };

    for (const table of BUNDLE_TABLES) {
        const rows = await delegateOf(
            prisma as unknown as TemplateDb,
            table
        ).findMany({ where: { campaignId }, orderBy: { id: 'asc' } });

        snapshot.hashes[table.key] = Object.fromEntries(
            rows.map((row) => [String(row.id), rowHash(row, table)])
        );
        snapshot.slugs[table.key] = Object.fromEntries(
            rows.map((row) => [String(row.id), row.slug])
        );

        const stamps = rows.flatMap((row) =>
            row.updatedAt instanceof Date ? [row.updatedAt.getTime()] : []
        );

        snapshot.maxUpdatedAt[table.key] =
            stamps.length > 0
                ? new Date(Math.max(...stamps)).toISOString()
                : null;
    }

    return snapshot;
}

export interface SnapshotDiff {
    created: number;
    deleted: number;
    changed: number;
    slugsMissing: number;
}

export function diffSnapshots(
    before: CampaignSnapshot,
    after: CampaignSnapshot
): Record<string, SnapshotDiff> {
    return Object.fromEntries(
        Object.keys(after.hashes).map((table) => {
            const was = before.hashes[table] ?? {};

            const now = after.hashes[table];

            return [
                table,
                {
                    created: Object.keys(now).filter((id) => !(id in was))
                        .length,
                    deleted: Object.keys(was).filter((id) => !(id in now))
                        .length,
                    changed: Object.keys(now).filter(
                        (id) => id in was && was[id] !== now[id]
                    ).length,
                    slugsMissing: Object.values(after.slugs[table]).filter(
                        (slug) => !slug
                    ).length,
                },
            ];
        })
    );
}
