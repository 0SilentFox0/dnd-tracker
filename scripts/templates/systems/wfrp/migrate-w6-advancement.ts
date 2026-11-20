#!/usr/bin/env tsx
/**
 * Converts heroes of canon5e WFRP campaigns from the legacy +1 advancement ledger to +5 purchases at canon prices
 * (rule in systems/wfrp/rules/advancement/migrate-w6.ts). Dry run by default; --apply writes and is allowed only on a
 * database named prodcopy_*. Per-hero report: status, points, XP spent/available before and after.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/templates/systems/wfrp/migrate-w6-advancement.ts [--apply] [--allow-remote]
 */
import '@/lib/utils/rules/systems/registry';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';
import { migrateHero } from '@/systems/wfrp/rules/advancement/migrate-w6';
import { readCharacteristics } from '@/systems/wfrp/rules/characteristics/keys';
import { editionOf } from '@/systems/wfrp/rules/edition';

const flags = new Set(process.argv.slice(2));

const apply = flags.has('--apply');

function databaseName(url: string | undefined): string {
    if (!url) throw new Error('DATABASE_URL is not set');

    return new URL(url).pathname.replace(/^\//, '');
}

async function main() {
    const name = databaseName(process.env.DATABASE_URL);

    assertSeedTarget(process.env.DATABASE_URL, flags.has('--allow-remote'));

    if (apply && !name.startsWith('prodcopy_'))
        throw new Error(`--apply is allowed only on prodcopy_* (got ${name})`);

    const { prisma } = await import('@/lib/db');

    const { parseRules } = await import('@/lib/utils/rules/schema');

    const totals: Record<string, number> = {};

    try {
        const campaigns = await prisma.campaign.findMany({
            select: { id: true, name: true, rules: true },
        });

        for (const campaign of campaigns) {
            const edition = editionOf(campaign.rules as object);

            if (edition.xpTables !== 'canon5e') continue;

            let advancement;

            try {
                advancement = parseRules(campaign.rules).advancement;
            } catch {
                continue;
            }

            if (!advancement) continue;

            console.log(`campaign ${campaign.name} (${campaign.id})`);

            const heroes = await prisma.character.findMany({
                where: { campaignId: campaign.id },
                select: {
                    id: true,
                    name: true,
                    experience: true,
                    characteristics: true,
                    updatedAt: true,
                },
            });

            for (const hero of heroes) {
                const raw = (hero.characteristics ?? {}) as Record<
                    string,
                    unknown
                >;

                const report = migrateHero(
                    hero.experience,
                    readCharacteristics(hero),
                    advancement,
                    edition.advanceStep
                );

                totals[report.status] = (totals[report.status] ?? 0) + 1;

                const moves = report.changes
                    .map(
                        (c) =>
                            `${c.key} ${c.from}->${c.to} (refund ${c.refund})`
                    )
                    .join(', ');

                console.log(
                    `  ${report.status.padEnd(11)} ${hero.name} · spent ${report.spentBefore}->${report.spentAfter} · available ${report.availableBefore}->${report.availableAfter}${report.reason ? ` · ${report.reason}` : ''}${moves ? ` · ${moves}` : ''}`
                );

                if (!apply || report.status !== 'converted') continue;

                const { count } = await prisma.character.updateMany({
                    where: { id: hero.id, updatedAt: hero.updatedAt },
                    data: {
                        characteristics: {
                            ...raw,
                            advances: report.next.advances,
                            skillAdvances: report.next.skillAdvances,
                            ledger: report.next.ledger,
                        },
                    },
                });

                if (count === 0) {
                    totals.skipped = (totals.skipped ?? 0) + 1;

                    console.log(`  SKIPPED ${hero.name}: changed concurrently`);
                }
            }
        }

        console.log(
            `${apply ? 'APPLIED' : 'DRY RUN'} on ${name} · ${JSON.stringify(totals)}`
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
