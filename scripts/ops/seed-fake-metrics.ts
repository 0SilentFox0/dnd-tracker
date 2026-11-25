#!/usr/bin/env tsx
/**
 * Seeds 48 h of minute metrics (plus 7 d hourly), one active crit alert and some history into the LOCAL
 * database for the /ops live check. Refuses a non-local DATABASE_URL. `--clean` deletes every ops_* row.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/ops/seed-fake-metrics.ts [--clean]
 */
import { HOUR_MS, MINUTE_MS } from '@/lib/constants/time';
import { buildSeedRows, type SeedRow } from '@/scripts/ops/lib/fake-metrics';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const CHUNK = 2000;

const SEED_DAYS = 7;

async function main() {
    assertSeedTarget(process.env.DATABASE_URL, false);

    const { prisma } = await import('@/lib/db');

    try {
        await prisma.$transaction([
            prisma.opsMetricBucket.deleteMany(),
            prisma.opsMetricHourly.deleteMany(),
            prisma.opsAlertState.deleteMany(),
            prisma.opsAlertEvent.deleteMany(),
        ]);

        if (process.argv.includes('--clean')) {
            console.log('ops tables cleaned');

            return;
        }

        const now = Date.now();

        const minuteFrom = now - 48 * HOUR_MS;

        const minute: SeedRow[] = buildSeedRows(minuteFrom, now, MINUTE_MS);

        const hourly: SeedRow[] = buildSeedRows(
            now - SEED_DAYS * 24 * HOUR_MS,
            Math.floor(now / HOUR_MS) * HOUR_MS,
            HOUR_MS
        );

        for (let i = 0; i < minute.length; i += CHUNK)
            await prisma.opsMetricBucket.createMany({
                data: minute.slice(i, i + CHUNK),
                skipDuplicates: true,
            });

        for (let i = 0; i < hourly.length; i += CHUNK)
            await prisma.opsMetricHourly.createMany({
                data: hourly.slice(i, i + CHUNK),
                skipDuplicates: true,
            });

        const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR_MS);

        await prisma.opsAlertState.createMany({
            data: [
                {
                    rule: 'db.connections',
                    status: 'crit',
                    since: at(0.5),
                    lastValue: 0.93,
                },
                {
                    rule: 'battle.p95',
                    status: 'warn',
                    since: at(2),
                    lastValue: 1800,
                },
            ],
        });

        await prisma.opsAlertEvent.createMany({
            data: [
                {
                    rule: 'battle.p95',
                    from: 'ok',
                    to: 'warn',
                    value: 1800,
                    at: at(2),
                    notified: true,
                },
                {
                    rule: 'db.connections',
                    from: 'ok',
                    to: 'warn',
                    value: 0.75,
                    at: at(1),
                    notified: true,
                },
                {
                    rule: 'db.connections',
                    from: 'warn',
                    to: 'crit',
                    value: 0.93,
                    at: at(0.5),
                    notified: false,
                },
                {
                    rule: 'api.5xx',
                    from: 'ok',
                    to: 'warn',
                    value: 12,
                    at: at(20),
                    notified: true,
                },
                {
                    rule: 'api.5xx',
                    from: 'warn',
                    to: 'ok',
                    value: 0,
                    at: at(19),
                    notified: true,
                },
            ],
        });

        console.log(
            `seeded ${minute.length} minute and ${hourly.length} hourly rows`
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
