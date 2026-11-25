'use client';

import { useTranslations } from 'next-intl';

import { TimeSeriesChart } from './TimeSeriesChart';

import { useOpsSeries } from '@/lib/hooks/ops';
import type { ChartGroup } from '@/lib/ops/chart-groups';
import type { OpsLimitRow, OpsRange } from '@/types/ops';

export function OpsChartGroup({
    group,
    range,
    limits,
}: {
    group: ChartGroup;
    range: OpsRange;
    limits: OpsLimitRow[];
}) {
    const t = useTranslations('ops.charts');

    const keys = group.charts.flatMap((c) => c.series.map((s) => s.key));

    const { data } = useOpsSeries(range, keys);

    return (
        <section
            aria-labelledby={`ops-group-${group.id}`}
            className="space-y-3"
        >
            <h3
                id={`ops-group-${group.id}`}
                className="text-base font-semibold"
            >
                {t(`groups.${group.id}`)}
            </h3>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {group.charts.map((chart) => (
                    <TimeSeriesChart
                        key={chart.id}
                        chart={chart}
                        response={data}
                        limits={limits}
                    />
                ))}
            </div>
        </section>
    );
}
