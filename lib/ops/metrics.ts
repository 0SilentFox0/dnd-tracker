import { after } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import {
    canonicalLabels,
    type MetricDef,
    metricDef,
    type MetricKey,
} from '@/lib/ops/metrics-catalog';
import { logger } from '@/lib/utils/common/logger';
import { bucketStart, latencyBucket } from '@/lib/utils/ops/latency';

type Labels = Record<string, string>;
interface Entry {
    bucket: Date;
    metric: string;
    labels: string;
    n: number;
    sum: number;
    max: number;
}

const FLUSH_INTERVAL_MS = 30_000;

const INSERT_CHUNK = 500;

let buffer = new Map<string, Entry>();

let lastFlushAt = Date.now();

function record(
    bucket: Date,
    metric: string,
    labels: string,
    value: number
): void {
    const id = `${bucket.getTime()}\u0000${metric}\u0000${labels}`;

    const entry = buffer.get(id);

    if (entry) {
        entry.n += 1;
        entry.sum += value;
        entry.max = Math.max(entry.max, value);
    } else {
        buffer.set(id, {
            bucket,
            metric,
            labels,
            n: 1,
            sum: value,
            max: value,
        });
    }
}

function lookup(key: string): MetricDef | null {
    const def = metricDef(key);

    // Typos fail loudly outside production; production drops silently.
    if (!def && process.env.NODE_ENV !== 'production')
        throw new Error(`Unknown metric: ${key}`);

    return def;
}

function maybeFlush(): void {
    const now = Date.now();

    if (now - lastFlushAt < FLUSH_INTERVAL_MS) return;

    lastFlushAt = now;

    try {
        after(() => flushMetrics());
    } catch {
        void flushMetrics();
    }
}

export function incr(key: MetricKey, by = 1, labels?: Labels): void {
    if (!lookup(key)) return;

    record(bucketStart(new Date()), key, canonicalLabels(labels, key), by);
    maybeFlush();
}

export function gauge(key: MetricKey, value: number, labels?: Labels): void {
    if (!lookup(key)) return;

    record(bucketStart(new Date()), key, canonicalLabels(labels, key), value);
    maybeFlush();
}

export function observe(key: MetricKey, ms: number, labels?: Labels): void {
    if (lookup(key)?.kind !== 'timing') return;

    const bucket = bucketStart(new Date());

    const base = canonicalLabels(labels, key);

    record(bucket, `${key}:count`, base, 1);
    record(bucket, `${key}:sum`, base, ms);
    record(
        bucket,
        `${key}:le`,
        canonicalLabels({ ...labels, le: latencyBucket(ms) }, undefined),
        1
    );
    maybeFlush();
}

export async function flushMetrics(): Promise<void> {
    if (buffer.size === 0) return;

    const entries = [...buffer.values()];

    buffer = new Map();

    try {
        for (let i = 0; i < entries.length; i += INSERT_CHUNK) {
            const rows = entries
                .slice(i, i + INSERT_CHUNK)
                .map(
                    (e) =>
                        Prisma.sql`(${e.bucket}, ${e.metric}, ${e.labels}, ${e.n}, ${e.sum}, ${e.max})`
                );

            await prisma.$executeRaw`
                INSERT INTO ops_metric_buckets AS t (bucket, metric, labels, n, sum, max)
                VALUES ${Prisma.join(rows)}
                ON CONFLICT (bucket, metric, labels) DO UPDATE SET
                    n = t.n + EXCLUDED.n,
                    sum = t.sum + EXCLUDED.sum,
                    max = GREATEST(t.max, EXCLUDED.max)`;
        }
    } catch (err) {
        logger.warn(
            '[ops] metrics flush failed',
            { entries: entries.length },
            err
        );
    }
}

export function __resetForTests(): void {
    buffer = new Map();
    lastFlushAt = Date.now();
}
