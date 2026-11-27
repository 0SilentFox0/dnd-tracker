'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
    ChartPanel,
    type ChartSeries,
    TimeSeriesChart,
} from '@/components/admin/charts';
import type { AdminOverview } from '@/types/admin';

type SeriesKey = keyof Omit<AdminOverview['series'], 'days'>;

export function OverviewCharts({
    series,
}: {
    series: AdminOverview['series'];
}) {
    const t = useTranslations('admin.overview.charts');

    const locale = useLocale();

    const times = useMemo(
        () => series.days.map((d) => Date.parse(`${d}T00:00:00Z`)),
        [series.days]
    );

    const format = useMemo(() => {
        const nf = new Intl.NumberFormat(locale, { notation: 'compact' });

        return (v: number) => nf.format(Math.abs(v));
    }, [locale]);

    const line = (key: SeriesKey, values = series[key]): ChartSeries => ({
        id: key,
        label: t(key),
        values,
    });

    const has = (list: ChartSeries[]) =>
        list.some((s) => s.values.some((v) => v !== 0));

    const panels: {
        id: string;
        title: string;
        kind: 'line' | 'area' | 'bars';
        list: ChartSeries[];
    }[] = [
        {
            id: 'total',
            title: t('total'),
            kind: 'area',
            list: [line('usersTotal')],
        },
        {
            id: 'growth',
            title: t('growth'),
            kind: 'bars',
            list: [
                line('signups'),
                line(
                    'deletions',
                    series.deletions.map((n) => -n)
                ),
            ],
        },
        {
            id: 'activity',
            title: t('activity'),
            kind: 'line',
            list: [line('dau'), line('wau'), line('mau')],
        },
        {
            id: 'content',
            title: t('content'),
            kind: 'line',
            list: [line('campaigns'), line('battles'), line('characters')],
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {panels.map((p) => (
                <ChartPanel
                    key={p.id}
                    title={p.title}
                    empty={!has(p.list)}
                    emptyText={t('noData')}
                >
                    <TimeSeriesChart
                        title={p.title}
                        times={times}
                        series={p.list}
                        kind={p.kind}
                        format={format}
                        caption={t('perDay')}
                    />
                </ChartPanel>
            ))}
        </div>
    );
}
