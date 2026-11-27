'use client';

import { useTranslations } from 'next-intl';

import { BarBreakdown, ChartPanel } from '@/components/admin/charts';
import type { Row } from '@/types/admin';

export function BreakdownChart({
    title,
    rows,
}: {
    title: string;
    rows: Row[];
}) {
    const t = useTranslations('admin');

    return (
        <ChartPanel
            title={title}
            empty={rows.length === 0}
            emptyText={t('overview.charts.noData')}
        >
            <BarBreakdown
                title={title}
                rows={rows.map((r) => ({
                    key: r.key,
                    label: r.key === 'none' ? t('common.none') : r.key,
                    value: r.n,
                }))}
            />
        </ChartPanel>
    );
}
