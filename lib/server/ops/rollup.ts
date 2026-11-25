import { DAY_MS, HOUR_MS } from '@/lib/constants/time';
import { prisma } from '@/lib/db';

const MINUTE_RETENTION_HOURS = 48;

const HOURLY_RETENTION_DAYS = 90;

const DEFAULT_LOOKBACK_HOURS = 3;

/** Idempotent: completed hours are recomputed from minute rows still within retention. */
export async function rollupAndPrune(
    now: Date = new Date(),
    options: { lookbackHours?: number } = {}
): Promise<void> {
    const lookback = Math.min(
        options.lookbackHours ?? DEFAULT_LOOKBACK_HOURS,
        MINUTE_RETENTION_HOURS - 1
    );

    const hourStart = new Date(Math.floor(now.getTime() / HOUR_MS) * HOUR_MS);

    const from = new Date(hourStart.getTime() - lookback * HOUR_MS);

    await prisma.$executeRaw`
        INSERT INTO ops_metric_hourly AS h (bucket, metric, labels, n, sum, max)
        SELECT date_trunc('hour', bucket), metric, labels, sum(n)::int, sum(sum), max(max)
        FROM ops_metric_buckets
        WHERE bucket >= ${from} AND bucket < ${hourStart}
        GROUP BY 1, 2, 3
        ON CONFLICT (bucket, metric, labels) DO UPDATE SET
            n = EXCLUDED.n,
            sum = EXCLUDED.sum,
            max = EXCLUDED.max`;

    const minuteCutoff = new Date(
        now.getTime() - MINUTE_RETENTION_HOURS * HOUR_MS
    );

    const longCutoff = new Date(now.getTime() - HOURLY_RETENTION_DAYS * DAY_MS);

    await Promise.all([
        prisma.opsMetricBucket.deleteMany({
            where: { bucket: { lt: minuteCutoff } },
        }),
        prisma.opsMetricHourly.deleteMany({
            where: { bucket: { lt: longCutoff } },
        }),
        prisma.opsAlertEvent.deleteMany({
            where: { at: { lt: longCutoff } },
        }),
    ]);
}
