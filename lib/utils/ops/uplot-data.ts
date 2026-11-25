import type { OpsSeriesPoint } from '@/types/ops';

export type UplotData = (number | null)[][];

/** uPlot wants epoch seconds on x and a shared grid; all series of a response use the same grid. */
export function toUplotData(series: OpsSeriesPoint[][]): UplotData {
    const base = series[0] ?? [];

    return [
        base.map((p) => Math.round(p.t / 1000)),
        ...series.map((points) => points.map((p) => p.v)),
    ];
}

export const hasAnyValue = (series: OpsSeriesPoint[][]): boolean =>
    series.some((points) => points.some((p) => p.v !== null));
