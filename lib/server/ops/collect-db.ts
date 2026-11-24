import { POLLED_BATTLE_STATUSES } from '@/lib/constants/battle';
import { prisma } from '@/lib/db';
import { gauge } from '@/lib/server/ops/metrics';

interface ActivityRow {
    state: string | null;
    n: number;
}

interface StatsRow {
    max_conn: number;
    longest: number;
    waiting: number;
    size: number;
    deadlocks: number;
    hit: number;
    read: number;
}

export async function collectDbGauges(): Promise<void> {
    const [activity, stats, battles] = await Promise.all([
        prisma.$queryRaw<ActivityRow[]>`
            SELECT state, count(*)::int AS n
            FROM pg_stat_activity
            WHERE datname = current_database()
            GROUP BY state`,
        prisma.$queryRaw<StatsRow[]>`
            SELECT
                (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_conn,
                COALESCE((
                    SELECT max(EXTRACT(EPOCH FROM now() - xact_start))
                    FROM pg_stat_activity
                    WHERE datname = current_database()
                      AND xact_start IS NOT NULL
                      AND state <> 'idle'
                      AND pid <> pg_backend_pid()
                ), 0)::float8 AS longest,
                (
                    SELECT count(*) FROM pg_stat_activity
                    WHERE datname = current_database() AND wait_event_type = 'Lock'
                )::int AS waiting,
                pg_database_size(current_database())::float8 AS size,
                d.deadlocks::float8 AS deadlocks,
                d.blks_hit::float8 AS hit,
                d.blks_read::float8 AS read
            FROM pg_stat_database d
            WHERE d.datname = current_database()`,
        prisma.battleScene.count({
            where: { status: { in: [...POLLED_BATTLE_STATUSES] } },
        }),
    ]);

    const byState = { active: 0, idle: 0, idle_in_tx: 0, total: 0 };

    for (const row of activity) {
        byState.total += row.n;

        if (row.state === 'active') byState.active += row.n;
        else if (row.state === 'idle') byState.idle += row.n;
        else if (row.state?.startsWith('idle in transaction'))
            byState.idle_in_tx += row.n;
    }

    for (const [state, value] of Object.entries(byState)) {
        gauge('db.connections', value, { state });
    }

    const row = stats[0];

    if (row) {
        gauge('db.max_connections', Number(row.max_conn));
        gauge('db.longest_tx_s', Number(row.longest));
        gauge('db.waiting_locks', Number(row.waiting));
        gauge('db.size_bytes', Number(row.size));
        gauge('db.deadlocks', Number(row.deadlocks));

        const reads = Number(row.hit) + Number(row.read);

        if (reads > 0) gauge('db.cache_hit_ratio', Number(row.hit) / reads);
    }

    gauge('app.active_battles', battles);
}
