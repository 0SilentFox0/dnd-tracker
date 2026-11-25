import { MINUTE_MS } from '@/lib/constants/time';
import type { AlertRule } from '@/lib/ops/alert-rules';
import type { Limit } from '@/lib/ops/limits';
import type { AlertStatus } from '@/lib/utils/ops/alert-state';
import { RANK, targetStatus } from '@/lib/utils/ops/alert-state';
import { forecastHoursToLimit } from '@/lib/utils/ops/forecast';
import type { OpsLimitRow, OpsSeriesPoint } from '@/types/ops';

const MAX_FORECAST_HOURS = 30 * 24;

export const STALE_READING_MS = 15 * MINUTE_MS;

export function lastValue(points: OpsSeriesPoint[]): number | null {
    for (let i = points.length - 1; i >= 0; i--) {
        const v = points[i].v;

        if (v !== null) return v;
    }

    return null;
}

export function buildLimitRow(args: {
    rule: Pick<AlertRule, 'id' | 'warn' | 'crit' | 'direction'>;
    provider: string;
    metric: string;
    limit: Limit | null;
    points: OpsSeriesPoint[];
}): OpsLimitRow {
    const { rule, provider, metric, limit, points } = args;

    const value = lastValue(points);

    const max = limit?.value ?? null;

    const percent = value !== null && max ? value / max : null;

    const forecast =
        max && value !== null
            ? forecastHoursToLimit(
                  points.filter(
                      (p): p is { t: number; v: number } => p.v !== null
                  ),
                  max
              )
            : null;

    return {
        id: rule.id,
        provider,
        metric,
        unit: limit?.unit ?? 'count',
        period: limit?.period ?? 'now',
        value,
        limit: max,
        percent,
        status:
            percent === null ? null : targetStatus(rule as AlertRule, percent),
        forecastHours:
            forecast !== null && forecast > MAX_FORECAST_HOURS
                ? null
                : forecast,
    };
}

export function worstStatus(
    statuses: (AlertStatus | null)[]
): AlertStatus | null {
    let worst: AlertStatus | null = null;

    for (const s of statuses) {
        if (s && (!worst || RANK[s] > RANK[worst])) worst = s;
    }

    return worst;
}
