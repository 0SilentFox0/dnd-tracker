export interface ChartSeries {
    id: string;
    label: string;
    values: (number | null)[];
}

export interface TimeSeriesChartProps {
    title: string;
    times: number[];
    series: ChartSeries[];
    format: (v: number) => string;
    caption?: string;
    options?: {
        kind?: 'line' | 'area' | 'bars';
        limit?: { value: number; label: string };
        height?: number;
    };
}

export interface BarBreakdownProps {
    title: string;
    rows: { key: string; label: string; value: number }[];
    format?: (v: number) => string;
}
