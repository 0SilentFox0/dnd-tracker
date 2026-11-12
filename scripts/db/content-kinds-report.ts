#!/usr/bin/env tsx
/**
 * Read-only: рядки видів контенту, що лежать у кампаніях, де вид поза композицією (D15: приховані, не видалені).
 *
 *   pnpm exec tsx scripts/db/content-kinds-report.ts [--json] [--allow-remote]
 */
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const flags = new Set(process.argv.slice(2));

async function main() {
    assertSeedTarget(process.env.DATABASE_URL, flags.has('--allow-remote'));

    const { prisma } = await import('@/lib/db');

    const { hiddenContentRows } = await import(
        '@/lib/utils/rules/systems/content-kinds-report'
    );

    const counted = async (
        kind: string,
        rows: Promise<{ campaignId: string }[]>
    ) => {
        const perCampaign = new Map<string, number>();

        for (const { campaignId } of await rows)
            perCampaign.set(campaignId, (perCampaign.get(campaignId) ?? 0) + 1);

        return [...perCampaign].map(([campaignId, count]) => ({
            campaignId,
            kind,
            count,
        }));
    };

    const ids = { select: { campaignId: true } };

    try {
        const campaigns = await prisma.campaign.findMany({
            select: { id: true, rules: true },
        });

        const groups = await Promise.all([
            counted('careers', prisma.career.findMany(ids)),
            counted('classes', prisma.gameClass.findMany(ids)),
            counted('backgrounds', prisma.background.findMany(ids)),
            counted('main-skills', prisma.mainSkill.findMany(ids)),
            counted('skills', prisma.skill.findMany(ids)),
            counted('artifact-sets', prisma.artifactSet.findMany(ids)),
        ]);

        const rows = hiddenContentRows(campaigns, groups.flat());

        if (flags.has('--json'))
            console.log(JSON.stringify({ hidden: rows }, null, 2));
        else {
            for (const r of rows)
                console.log(`${r.campaignId}\t${r.kind}\t${r.count}`);
            console.log(`прихованих груп: ${rows.length}`);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'помилка');
    process.exitCode = 1;
});
