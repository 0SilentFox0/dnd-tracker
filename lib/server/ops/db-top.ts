import 'server-only';
import { prisma } from '@/lib/db';
import { errorMessage } from '@/lib/utils/common/error-message';
import { logger } from '@/lib/utils/common/logger';
import type { OpsDbTop, OpsLongTx } from '@/types/ops';

const QUERY_MAX_CHARS = 200;

type StatementRow = {
    query: string;
    calls: bigint | number;
    total_ms: number;
    mean_ms: number;
};

async function longTransactions(): Promise<OpsLongTx[]> {
    const rows = await prisma.$queryRaw<
        { seconds: number; state: string; wait_event_type: string | null }[]
    >`
        SELECT extract(epoch FROM (now() - xact_start))::float AS seconds,
               state,
               wait_event_type
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
          AND xact_start IS NOT NULL
          AND now() - xact_start > interval '5 seconds'
        ORDER BY xact_start
        LIMIT 5`;

    return rows.map((r) => ({
        seconds: Math.round(r.seconds),
        state: r.state,
        waitEventType: r.wait_event_type,
    }));
}

async function topStatements(): Promise<OpsDbTop['rows'] | null> {
    const ext = await prisma.$queryRaw<{ ok: number }[]>`
        SELECT 1 AS ok FROM pg_extension WHERE extname = 'pg_stat_statements'`;

    if (!ext.length) return null;

    const rows = await prisma.$queryRaw<StatementRow[]>`
        SELECT left(query, ${QUERY_MAX_CHARS}) AS query,
               calls,
               total_exec_time::float AS total_ms,
               mean_exec_time::float AS mean_ms
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
        ORDER BY total_exec_time DESC
        LIMIT 10`;

    return rows.map((r) => ({
        query: r.query,
        calls: Number(r.calls),
        totalMs: Math.round(r.total_ms),
        meanMs: Math.round(r.mean_ms * 10) / 10,
    }));
}

export async function readDbTop(): Promise<OpsDbTop> {
    const [statements, longTx] = await Promise.all([
        topStatements().catch((error: unknown) => {
            logger.warn('ops db-top statements failed', {
                error: errorMessage(error, 'unknown'),
            });

            return null;
        }),
        longTransactions().catch(() => [] as OpsLongTx[]),
    ]);

    return {
        available: statements !== null,
        rows: statements ?? [],
        longTx,
    };
}
