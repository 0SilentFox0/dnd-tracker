#!/usr/bin/env tsx
/**
 * Read-only: every `abilities` JSON (and spell effects) must pass the composition of ITS campaign
 * (effect/flag, formula variable and ability source owners). Exit 1 when any row violates.
 *
 *   pnpm exec tsx scripts/db/abilities-ownership-report.ts [--json] [--allow-remote]
 */
import {
    OWNERSHIP_TABLES,
    rowViolations,
    type Violation,
} from '@/lib/utils/abilities/ownership-report';
import { parseRules } from '@/lib/utils/rules/schema';
import { composition } from '@/lib/utils/rules/systems/catalog';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const flags = new Set(process.argv.slice(2));

type Row = Record<string, unknown> & { id: string; campaignId: string };

async function collect(): Promise<Violation[]> {
    assertSeedTarget(process.env.DATABASE_URL, flags.has('--allow-remote'));

    const { prisma } = await import('@/lib/db');

    try {
        const campaigns = await prisma.campaign.findMany({
            select: { id: true, rules: true },
        });

        const compositions = new Map(
            campaigns.map((c) => [
                c.id,
                composition(parseRules(c.rules).system),
            ])
        );

        const delegates: Record<string, { findMany: () => Promise<Row[]> }> = {
            skills: prisma.skill,
            artifact_sets: prisma.artifactSet,
            artifacts: prisma.artifact,
            races: prisma.race,
            feats: prisma.feat,
            units: prisma.unit,
            classes: prisma.gameClass,
            spells: prisma.spell,
        } as never;

        const out: Violation[] = [];

        for (const { table, source } of OWNERSHIP_TABLES) {
            for (const row of await delegates[table].findMany()) {
                const c = compositions.get(row.campaignId);

                if (c)
                    out.push(
                        ...rowViolations(
                            { table, id: row.id, source, data: row },
                            c
                        )
                    );
            }
        }

        return out;
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    const violations = await collect();

    if (flags.has('--json')) console.log(JSON.stringify(violations, null, 2));
    else {
        for (const v of violations)
            console.log(
                `${v.table}\t${v.id}\t${v.path}\t${v.kind}\t${v.reason}`
            );

        console.log(`violations: ${violations.length}`);
    }

    process.exitCode = violations.length === 0 ? 0 : 1;
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'error');
    process.exitCode = 1;
});
