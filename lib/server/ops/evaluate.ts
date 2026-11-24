import { Prisma } from '@prisma/client';

import { DAY_MS, MINUTE_MS } from '@/lib/constants/time';
import { prisma } from '@/lib/db';
import {
    ALERT_RULES,
    type AlertRule,
    WINDOW_MINUTES,
} from '@/lib/ops/alert-rules';
import { SECRET_EXPIRIES } from '@/lib/ops/expiries';
import { limitFor } from '@/lib/ops/limits';
import { sendAlert } from '@/lib/server/ops/notify';
import { buildAlertMessage } from '@/lib/utils/ops/alert-message';
import {
    type AlertStateRow,
    type AlertStatus,
    nextAlertState,
} from '@/lib/utils/ops/alert-state';
import { quantileFromBuckets } from '@/lib/utils/ops/latency';

const DEFAULT_FANOUT = 6;

type Agg = 'sum' | 'avg' | 'max';

async function aggregate(
    metric: string,
    labels: string | undefined,
    agg: Agg,
    from: Date
): Promise<number | null> {
    const res = await prisma.opsMetricBucket.aggregate({
        where: {
            metric,
            bucket: { gte: from },
            ...(labels !== undefined && { labels }),
        },
        _sum: { n: true, sum: true },
        _max: { max: true },
    });

    if (agg === 'sum') return res._sum.sum ?? 0;

    if (agg === 'max') return res._max.max ?? null;

    return res._sum.n ? (res._sum.sum ?? 0) / res._sum.n : null;
}

async function p95(metric: string, from: Date): Promise<number | null> {
    const rows = await prisma.opsMetricBucket.groupBy({
        by: ['labels'],
        where: { metric: `${metric}:le`, bucket: { gte: from } },
        _sum: { sum: true },
    });

    const counts: Record<string, number> = {};

    for (const row of rows) {
        const le = /(?:^|,)le=([^,]+)/.exec(row.labels)?.[1];

        if (le) counts[le] = (counts[le] ?? 0) + (row._sum.sum ?? 0);
    }

    return quantileFromBuckets(counts, 0.95);
}

function expiryDays(now: Date): number | null {
    const days = SECRET_EXPIRIES.map(
        (e) => (new Date(e.at).getTime() - now.getTime()) / DAY_MS
    );

    return days.length ? Math.min(...days) : null;
}

const FANOUT = (() => {
    const parsed = Number(process.env.OPS_PUSHER_FANOUT);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FANOUT;
})();

export async function readRuleValue(
    rule: AlertRule,
    now: Date
): Promise<{ value: number | null; limit?: number }> {
    if (rule.agg === 'expiryDays') return { value: expiryDays(now) };

    const from = new Date(
        now.getTime() - WINDOW_MINUTES[rule.window] * MINUTE_MS
    );

    if (rule.agg === 'age') {
        const last = await aggregate(rule.metric, rule.labels, 'max', from);

        return {
            value: last === null ? null : (now.getTime() / 1000 - last) / 60,
        };
    }

    let value =
        rule.agg === 'p95'
            ? await p95(rule.metric, from)
            : await aggregate(rule.metric, rule.labels, rule.agg, from);

    if (value === null) return { value: null };

    if (rule.fanout) value *= FANOUT;

    if (rule.per) {
        const divisor = await aggregate(
            rule.per.metric,
            rule.per.labels,
            rule.per.agg,
            from
        );

        return { value: divisor ? value / divisor : null };
    }

    if (rule.limit) {
        const limit = limitFor(rule.limit.provider, rule.limit.key)?.value;

        return limit ? { value: value / limit, limit } : { value: null };
    }

    return { value };
}

const asStatus = (s: string | null): AlertStatus | null =>
    s === 'ok' || s === 'warn' || s === 'crit' ? s : null;

export async function evaluateAlerts(
    now: Date = new Date()
): Promise<{ evaluated: number; notified: number }> {
    const [rows, readings] = await Promise.all([
        prisma.opsAlertState.findMany(),
        Promise.all(ALERT_RULES.map((rule) => readRuleValue(rule, now))),
    ]);

    const prevByRule = new Map(rows.map((r) => [r.rule, r]));

    const steps = ALERT_RULES.map((rule, i) => {
        const row = prevByRule.get(rule.id);

        let prev: AlertStateRow | null = null;

        if (row) {
            const { rule: _rule, updatedAt: _updatedAt, ...fields } = row;

            prev = {
                ...fields,
                status: asStatus(row.status) ?? 'ok',
                lastNotifiedStatus: asStatus(row.lastNotifiedStatus),
            };
        }

        const { value, limit } = readings[i];

        return {
            rule,
            prev,
            value,
            limit,
            ...nextAlertState(prev, value, rule, now),
        };
    });

    const delivered = await Promise.all(
        steps.map(async ({ rule, value, limit, state, transition, notify }) => {
            if (!notify || transition === 'none') return false;

            const result = await sendAlert(
                buildAlertMessage(transition, rule, value, state.status, limit)
            );

            return result.telegram === 'ok' || result.email === 'ok';
        })
    );

    const writes = steps.flatMap(({ rule, prev, value, state }, i) => {
        if (delivered[i]) {
            state.lastNotifiedAt = now;
            state.lastNotifiedStatus = state.status;
        }

        const { silencedUntil: _silenced, ...data } = state;

        const ops: Prisma.PrismaPromise<unknown>[] = [
            prisma.opsAlertState.upsert({
                where: { rule: rule.id },
                create: { rule: rule.id, silencedUntil: null, ...data },
                update: data,
            }),
        ];

        if ((prev?.status ?? 'ok') !== state.status) {
            ops.push(
                prisma.opsAlertEvent.create({
                    data: {
                        rule: rule.id,
                        from: prev?.status ?? 'ok',
                        to: state.status,
                        value,
                        at: now,
                        notified: delivered[i],
                    },
                })
            );
        }

        return ops;
    });

    await prisma.$transaction(writes);

    return {
        evaluated: ALERT_RULES.length,
        notified: delivered.filter(Boolean).length,
    };
}
