'use client';

import { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';

import 'uplot/dist/uPlot.min.css';
import type { ChartUnit } from '@/lib/ops/chart-groups';
import { formatValue } from '@/lib/utils/ops/format';
import type { UplotData } from '@/lib/utils/ops/uplot-data';

const PALETTE = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed'];

const DASHES: (number[] | undefined)[] = [
    undefined,
    [6, 4],
    [2, 3],
    [10, 3, 2, 3],
    [1, 4],
];

const HEIGHT = 240;

const LIMIT_COLOR = '#ef4444';

export interface UplotChartProps {
    data: UplotData;
    labels: string[];
    unit: ChartUnit;
    unitLabel: string;
    timeLabel: string;
    limitIndex?: number;
}

function readColors(el: HTMLElement) {
    const text = getComputedStyle(el).color;

    return { text, grid: `color-mix(in srgb, ${text} 15%, transparent)` };
}

export default function UplotChart({
    data,
    labels,
    unit,
    unitLabel,
    timeLabel,
    limitIndex,
}: UplotChartProps) {
    const host = useRef<HTMLDivElement>(null);

    const plot = useRef<uPlot | null>(null);

    const latest = useRef(data);

    const [themeTick, setThemeTick] = useState(0);

    useEffect(() => {
        latest.current = data;
    }, [data]);

    useEffect(() => {
        const observer = new MutationObserver(() => setThemeTick((n) => n + 1));

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme'],
        });

        return () => observer.disconnect();
    }, []);

    const seriesKey = labels.join('\u0000');

    useEffect(() => {
        const el = host.current;

        if (!el) return;

        const names = seriesKey.split('\u0000');

        const { text, grid } = readColors(el);

        const axis = {
            stroke: text,
            grid: { stroke: grid, width: 1 },
            ticks: { stroke: grid, width: 1 },
        };

        const chart = new uPlot(
            {
                width: Math.max(el.clientWidth, 200),
                height: HEIGHT,
                legend: { show: true, live: true },
                cursor: { drag: { x: false, y: false } },
                scales: { x: { time: true } },
                axes: [
                    axis,
                    {
                        ...axis,
                        size: 64,
                        label: unitLabel,
                        values: (_u, ticks) =>
                            ticks.map((v) => formatValue(v, unit)),
                    },
                ],
                series: [
                    { label: timeLabel },
                    ...names.map((label, i) => ({
                        label,
                        stroke:
                            i === limitIndex
                                ? LIMIT_COLOR
                                : PALETTE[i % PALETTE.length],
                        dash:
                            i === limitIndex
                                ? [8, 4]
                                : DASHES[i % DASHES.length],
                        width: i === limitIndex ? 1.5 : 2,
                        spanGaps: false,
                        value: (_u: uPlot, v: number | null) =>
                            v === null ? '—' : formatValue(v, unit),
                    })),
                ],
            },
            latest.current as uPlot.AlignedData,
            el
        );

        plot.current = chart;

        const resize = new ResizeObserver(() =>
            chart.setSize({
                width: Math.max(el.clientWidth, 200),
                height: HEIGHT,
            })
        );

        resize.observe(el);

        return () => {
            resize.disconnect();
            chart.destroy();
            plot.current = null;
        };
    }, [seriesKey, unit, unitLabel, timeLabel, limitIndex, themeTick]);

    useEffect(() => {
        plot.current?.setData(data as uPlot.AlignedData);
    }, [data]);

    return (
        <div ref={host} className="w-full overflow-hidden text-foreground" />
    );
}
