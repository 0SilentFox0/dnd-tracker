#!/usr/bin/env tsx
import '@/lib/utils/rules/systems/registry';
import { buildLibrary } from '@/data/library/build';
import { prisma } from '@/lib/db';
import { withStoredColumns } from '@/lib/utils/rules/systems/column-view';
import { assertSeedTarget, parseArgs } from '@/scripts/seed/seed-library-lib';
import { d20RowData } from '@/scripts/shared/d20-row-data';

async function main() {
    const { campaignId, dryRun, allowRemote } = parseArgs(
        process.argv.slice(2)
    );

    const host = assertSeedTarget(process.env.DATABASE_URL, allowRemote);

    const initiativeByName = new Map(
        buildLibrary().units.map((u) => [u.name, u.initiative])
    );

    const units = (
        await prisma.unit.findMany({
            where: { campaignId },
            select: {
                id: true,
                name: true,
                initiative: true,
                characteristics: true,
            },
        })
    ).map(withStoredColumns);

    console.log(
        `БД: ${host} · кампанія ${campaignId} · юнітів ${units.length}${dryRun ? ' · DRY RUN' : ''}`
    );

    let changed = 0;

    for (const u of units) {
        const next = initiativeByName.get(u.name);

        if (next === undefined || next === u.initiative) continue;

        changed++;
        console.log(`${u.name}: ${u.initiative} → ${next}`);

        if (!dryRun)
            await prisma.$transaction(async (tx) => {
                await tx.$queryRaw`SELECT id FROM units WHERE id = ${u.id} FOR UPDATE`;

                const current = await tx.unit.findUnique({
                    where: { id: u.id },
                    select: { characteristics: true },
                });

                await tx.unit.update({
                    where: { id: u.id },
                    data: d20RowData(
                        { initiative: next },
                        current?.characteristics
                    ),
                });
            });
    }

    console.log(`${dryRun ? 'змінив би' : 'змінено'}: ${changed}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
