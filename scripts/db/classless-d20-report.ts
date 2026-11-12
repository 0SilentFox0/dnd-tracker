#!/usr/bin/env tsx
/**
 * Read-only: персонажі без класу в d20-кампаніях без модуля heroscaling (їхнє HP стане 1, Ч10 ризик 2).
 *
 *   pnpm exec tsx scripts/db/classless-d20-report.ts [--json] [--allow-remote]
 */
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const flags = new Set(process.argv.slice(2));

async function main() {
    assertSeedTarget(process.env.DATABASE_URL, flags.has('--allow-remote'));

    const { prisma } = await import('@/lib/db');

    const { classlessD20Characters } = await import(
        '@/lib/utils/rules/systems/classless-report'
    );

    try {
        const campaigns = await prisma.campaign.findMany({
            select: { id: true, rules: true },
        });

        const characters = await prisma.character.findMany({
            select: {
                id: true,
                campaignId: true,
                name: true,
                level: true,
                class: true,
                classes: true,
            },
        });

        const classes = await prisma.gameClass.findMany({
            select: { id: true, campaignId: true },
        });

        const rows = classlessD20Characters(campaigns, characters, classes);

        if (flags.has('--json'))
            console.log(
                JSON.stringify(
                    { characters: characters.length, classless: rows },
                    null,
                    2
                )
            );
        else {
            for (const r of rows)
                console.log(
                    `${r.campaignId}\t${r.characterId}\t${r.name}\tрівень ${r.level}`
                );
            console.log(
                `персонажів ${characters.length} · без класу в d20 без heroscaling ${rows.length}`
            );
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'помилка');
    process.exitCode = 1;
});
