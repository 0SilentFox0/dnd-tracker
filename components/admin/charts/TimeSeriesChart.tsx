'use client';

import dynamic from 'next/dynamic';

import type { TimeSeriesChartProps } from './types';

const View = dynamic(() => import('./TimeSeriesChartView'), {
    ssr: false,
    loading: () => <div className="h-[260px]" aria-hidden />,
});

export function TimeSeriesChart(props: TimeSeriesChartProps) {
    return <View {...props} />;
}
