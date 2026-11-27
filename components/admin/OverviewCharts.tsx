'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { HudPanel } from '@/components/hud/page';
import type { UplotData } from '@/lib/utils/ops/uplot-data';
import type { AdminOverview } from '@/types/admin';

const UplotChart = dynamic(() => import('@/components/ops/UplotChart'), {
    ssr: false,
    loading: () => <div className="h-[240px]" aria-hidden />,
});

type SeriesKey = keyof Omit<AdminOverview['series'], 'days'>;

function Chart({
    title,
    days,
    lines,
    secondaryFrom,
}: {
    title: string;
    days: string[];
    lines: { label: string; values: number[] }[];
    secondaryFrom?: number;
}) {
    const t = useTranslations('admin.overview.charts');

    const data = useMemo<UplotData>(
        () => [
            days.map((d) => Math.round(Date.parse(`${d}T00:00:00Z`) / 1000)),
            ...lines.map((l) => l.values),
        ],
        [days, lines]
    );

    const labels = useMemo(() => lines.map((l) => l.label), [lines]);

    const empty = lines.every((l) => l.values.every((v) => v === 0));

    return (
        <HudPanel as="div" className="space-y-2">
            <h3 className="hud-sc text-sm">{title}</h3>
            {empty ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    {t('noData')}
                </p>
            ) : (
                <UplotChart
                    data={data}
                    labels={labels}
                    unit="count"
                    unitLabel={t('count')}
                    timeLabel={t('time')}
                    secondaryFrom={secondaryFrom}
                />
            )}
        </HudPanel>
    );
}

export function OverviewCharts({
    series,
}: {
    series: AdminOverview['series'];
}) {
    const t = useTranslations('admin.overview.charts');

    const line = (key: SeriesKey, values = series[key]) => ({
        label: t(key),
        values,
    });

    const growth = useMemo(
        () => [
            line('signups'),
            line(
                'deletions',
                series.deletions.map((n) => -n)
            ),
            line('usersTotal'),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [series, t]
    );

    return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Chart
                title={t('growth')}
                days={series.days}
                lines={growth}
                secondaryFrom={2}
            />
            <Chart
                title={t('activity')}
                days={series.days}
                lines={[line('dau'), line('wau'), line('mau')]}
            />
            <Chart
                title={t('content')}
                days={series.days}
                lines={[line('campaigns'), line('battles'), line('characters')]}
            />
        </div>
    );
}
