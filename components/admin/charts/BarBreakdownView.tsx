'use client';

import {
    Bar,
    BarChart,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { ChartTooltipBody, type TooltipEntry } from './ChartTooltip';
import type { BarBreakdownProps } from './types';

const ROW = 30;

export default function BarBreakdownView({
    title,
    rows,
    format = String,
}: BarBreakdownProps) {
    return (
        <div
            role="img"
            aria-label={title}
            style={{ height: rows.length * ROW + 8 }}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={rows}
                    layout="vertical"
                    margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                >
                    <XAxis type="number" hide domain={[0, 'dataMax']} />
                    <YAxis
                        type="category"
                        dataKey="label"
                        width={80}
                        tick={{ fill: 'var(--hud-text)', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--hud-rule)' }}
                        content={({ active, payload }) =>
                            active && payload?.length ? (
                                <ChartTooltipBody
                                    title={String(payload[0].payload.label)}
                                    entries={payload as unknown as TooltipEntry[]}
                                    format={format}
                                    single
                                />
                            ) : null
                        }
                    />
                    <Bar
                        dataKey="value"
                        fill="var(--c1)"
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                        isAnimationActive={false}
                    >
                        <LabelList
                            dataKey="value"
                            position="right"
                            formatter={(v: unknown) => format(Number(v))}
                            style={{ fill: 'var(--hud-ink)', fontSize: 12 }}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
