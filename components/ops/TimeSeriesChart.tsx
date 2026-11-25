'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { HudPanel } from '@/components/hud/page';
import type { ChartDef } from '@/lib/ops/chart-groups';
import { hasAnyValue, toUplotData } from '@/lib/utils/ops/uplot-data';
import type { OpsLimitRow, OpsSeriesResponse } from '@/types/ops';

const UplotChart = dynamic(() => import('./UplotChart'), {
    ssr: false,
    loading: () => <div className="h-[240px]" aria-hidden />,
});

export function TimeSeriesChart({
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

    const data = useMemo(() => {
        const base = toUplotData(lists);

        return limit === null ? base : [...base, base[0].map(() => limit)];
    }, [lists, limit]);

    const labels = useMemo(
        () => [
            ...chart.series.map((s) => t(`series.${s.id}`)),
            ...(limit === null ? [] : [t('limit')]),
        ],
        [chart, limit, t]
    );

    const empty = !response || !hasAnyValue(lists);

    return (
        <HudPanel as="div" className="space-y-2">
            <h3 className="text-sm font-medium">{t(`items.${chart.id}`)}</h3>
            {empty ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    {response ? t('noData') : t('loading')}
                </p>
            ) : (
                <UplotChart
                    data={data}
                    labels={labels}
                    unit={chart.unit}
                    unitLabel={t(`units.${chart.unit}`)}
                    limitIndex={limit === null ? undefined : labels.length - 1}
                    timeLabel={t('time')}
                />
            )}
        </HudPanel>
    );
}
