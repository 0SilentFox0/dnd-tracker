'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { ChartPanel, TimeSeriesChart } from '@/components/admin/charts';
import type { ChartDef } from '@/lib/ops/chart-groups';
import { hasAnyValue,toChartData } from '@/lib/utils/ops/chart-data';
import { formatValue } from '@/lib/utils/ops/format';
import type { OpsLimitRow, OpsSeriesResponse } from '@/types/ops';

export function OpsTimeSeriesChart({
    chart,
    response,
    limits,
}: {
    chart: ChartDef;
    response: OpsSeriesResponse | undefined;
    limits: OpsLimitRow[];
}) {
    const t = useTranslations('ops.charts');

    const lists = useMemo(
        () =>
            response
                ? chart.series.map((s) => response.series[s.key] ?? [])
                : [],
        [chart, response]
    );

    const limit = useMemo(
        () =>
            limits.find(
                (r) =>
                    r.limit !== null &&
                    (r.id === chart.limitId ||
                        chart.series.some((s) => s.key === r.id))
            )?.limit ?? null,
        [limits, chart]
    );

    const { times, values } = useMemo(() => toChartData(lists), [lists]);

    const series = useMemo(
        () =>
            chart.series.map((s, i) => ({
                id: s.id,
                label: t(`series.${s.id}`),
                values: values[i] ?? [],
            })),
        [chart, values, t]
    );

    const empty = !response || !hasAnyValue(lists);

    const title = t(`items.${chart.id}`);

    return (
        <ChartPanel
            title={title}
            empty={empty}
            emptyText={response ? t('noData') : t('loading')}
        >
            <TimeSeriesChart
                title={title}
                times={times}
                series={series}
                kind={series.length === 1 ? 'area' : 'line'}
                format={(v) => formatValue(v, chart.unit)}
                caption={t(`units.${chart.unit}`)}
                limit={
                    limit === null
                        ? undefined
                        : { value: limit, label: t('limit') }
                }
            />
        </ChartPanel>
    );
}
