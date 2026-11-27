'use client';

import { useId, useMemo } from 'react';
import { useLocale } from 'next-intl';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { SERIES_COLORS, timeFormats } from './chart-format';
import { ChartLegend, type LegendItem } from './ChartLegend';
import { ChartTooltipBody, type TooltipEntry } from './ChartTooltip';
import type { TimeSeriesChartProps } from './types';

const TICK = { fill: 'var(--hud-muted)', fontSize: 12 };

const AXIS_LINE = { stroke: 'var(--hud-line)' };

export default function TimeSeriesChartView({
    title,
    times,
    series,
    format,
    caption,
    kind = 'line',
    limit,
    height = 260,
}: TimeSeriesChartProps) {
    const locale = useLocale();

    const uid = useId().replace(/\W/g, '');

    const fmt = useMemo(() => timeFormats(locale, times), [locale, times]);

    const rows = useMemo(
        () =>
            times.map((t, i) => {
                const row: Record<string, number | null> = { t };

                for (const s of series) row[s.id] = s.values[i] ?? null;

                return row;
            }),
        [times, series]
    );

    const legend: LegendItem[] = [
        ...series.map((s, i) => ({
            id: s.id,
            label: s.label,
            color: SERIES_COLORS[i % SERIES_COLORS.length],
        })),
        ...(limit
            ? [
                  {
                      id: 'limit',
                      label: limit.label,
                      color: 'var(--hud-danger, #ef4444)',
                      dashed: true,
                  },
              ]
            : []),
    ];

    const color = (i: number) => SERIES_COLORS[i % SERIES_COLORS.length];

    const axes = [
        <CartesianGrid
            key="grid"
            vertical={false}
            stroke="var(--hud-rule)"
        />,
        <XAxis
            key="x"
            dataKey="t"
            tick={TICK}
            tickLine={false}
            axisLine={AXIS_LINE}
            tickFormatter={fmt.tick}
            minTickGap={40}
            tickMargin={8}
        />,
        <YAxis
            key="y"
            width="auto"
            tick={TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={format}
            domain={kind === 'bars' ? ['auto', 'auto'] : [0, 'auto']}
            allowDecimals={false}
        />,
        <Tooltip
            key="tip"
            cursor={{ stroke: 'var(--hud-muted)', strokeDasharray: '3 3' }}
            content={({ active, payload, label }) =>
                active && payload?.length ? (
                    <ChartTooltipBody
                        title={fmt.full(Number(label))}
                        entries={payload as unknown as TooltipEntry[]}
                        format={format}
                        single={series.length === 1}
                    />
                ) : null
            }
        />,
        ...(limit
            ? [
                  <ReferenceLine
                      ifOverflow="extendDomain"
                      key="limit"
                      y={limit.value}
                      stroke="var(--hud-danger, #ef4444)"
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                  />,
              ]
            : []),
    ];

    const margin = { top: 8, right: 12, bottom: 0, left: 0 };

    return (
        <div className="space-y-2">
            <ChartLegend items={legend} caption={caption} />
            <div role="img" aria-label={title} style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {kind === 'bars' ? (
                        <BarChart data={rows} margin={margin} stackOffset="sign">
                            {axes}
                            <ReferenceLine y={0} stroke="var(--hud-line)" />
                            {series.map((s, i) => (
                                <Bar
                                    key={s.id}
                                    dataKey={s.id}
                                    name={s.label}
                                    stackId="a"
                                    fill={color(i)}
                                    radius={2}
                                    maxBarSize={18}
                                    isAnimationActive={false}
                                />
                            ))}
                        </BarChart>
                    ) : kind === 'area' ? (
                        <AreaChart data={rows} margin={margin}>
                            <defs>
                                {series.map((s, i) => (
                                    <linearGradient
                                        key={s.id}
                                        id={`${uid}-${s.id}`}
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor={color(i)}
                                            stopOpacity={0.35}
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor={color(i)}
                                            stopOpacity={0.02}
                                        />
                                    </linearGradient>
                                ))}
                            </defs>
                            {axes}
                            {series.map((s, i) => (
                                <Area
                                    key={s.id}
                                    dataKey={s.id}
                                    name={s.label}
                                    type="monotone"
                                    stroke={color(i)}
                                    strokeWidth={2}
                                    fill={`url(#${uid}-${s.id})`}
                                    dot={false}
                                    activeDot={{
                                        r: 4,
                                        stroke: 'var(--hud-panel-2)',
                                        strokeWidth: 2,
                                    }}
                                    isAnimationActive={false}
                                />
                            ))}
                        </AreaChart>
                    ) : (
                        <LineChart data={rows} margin={margin}>
                            {axes}
                            {series.map((s, i) => (
                                <Line
                                    key={s.id}
                                    dataKey={s.id}
                                    name={s.label}
                                    type="monotone"
                                    stroke={color(i)}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{
                                        r: 4,
                                        stroke: 'var(--hud-panel-2)',
                                        strokeWidth: 2,
                                    }}
                                    isAnimationActive={false}
                                />
                            ))}
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
