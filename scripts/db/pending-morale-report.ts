#!/usr/bin/env tsx
// legacy: needs the pre-drop schema
import '@/lib/utils/rules/systems/registry';
import { hasPendingMorale } from '@/scripts/db/lib/backfill-pending-morale-plan';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const flags = new Set(process.argv.slice(2));

const systemOf = (rules: unknown): string | undefined => {
    const system = (
        rules as { system?: { key?: unknown; modules?: unknown } } | null
    )?.system;

    if (typeof system?.key !== 'string') return undefined;

    const modules = Array.isArray(system.modules)
        ? system.modules.join(',')
        : '';

    return modules ? `${system.key}+${modules}` : system.key;
};

async function main() {
    assertSeedTarget(process.env.DATABASE_URL, flags.has('--allow-remote'));

    const { prisma } = await import('@/lib/db');

    try {
        const scenes = await prisma.battleScene.findMany({
            select: {
                id: true,
                status: true,
                rules: true,
                pendingMoraleCheck: true,
                systemState: true,
                campaignId: true,
            },
        });

        const campaigns = new Map(
            (
                await prisma.campaign.findMany({
                    select: { id: true, rules: true },
                })
            ).map((c) => [c.id, c.rules])
        );

        const counts = new Map<string, number>();

        let pending = 0;

        for (const scene of scenes) {
            if (!hasPendingMorale(scene.pendingMoraleCheck, scene.systemState))
                continue;

            pending++;

            const key = `${scene.status} · ${systemOf(scene.rules) ?? systemOf(campaigns.get(scene.campaignId)) ?? 'system не задано'}`;

            counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        const rows = [...counts.entries()].sort(([a], [b]) =>
            a.localeCompare(b)
        );

        if (flags.has('--json'))
            console.log(
                JSON.stringify(
                    {
                        scenes: scenes.length,
                        pending,
                        groups: Object.fromEntries(rows),
                    },
                    null,
                    2
                )
            );
        else {
            for (const [key, n] of rows) console.log(`${key}: ${n}`);
            console.log(
                `сцен ${scenes.length} · з pendingMoraleCheck ${pending}`
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
