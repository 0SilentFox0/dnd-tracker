import type { OpsSeriesPoint } from '@/types/ops';

/** All series of a response share one time grid, so the first one defines it. */
export function toChartData(series: OpsSeriesPoint[][]): {
    times: number[];
    values: (number | null)[][];
} {
    return {
        times: (series[0] ?? []).map((p) => p.t),
        values: series.map((points) => points.map((p) => p.v)),
    };
}

export const hasAnyValue = (series: OpsSeriesPoint[][]): boolean =>
    series.some((points) => points.some((p) => p.v !== null));
