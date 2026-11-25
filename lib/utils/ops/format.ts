import type { ChartUnit } from '@/lib/ops/chart-groups';

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

function scaled(value: number, step: number, units: string[]): string {
    let v = Math.abs(value);

    let i = 0;

    while (v >= step && i < units.length - 1) {
        v /= step;
        i++;
    }

    const digits = v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2;

    return `${value < 0 ? '-' : ''}${Number(v.toFixed(digits))}${units[i]}`;
}

export function formatBytes(value: number): string {
    return scaled(value, 1024, BYTE_UNITS);
}

export function formatCount(value: number): string {
    return scaled(value, 1000, ['', 'k', 'M', 'B']);
}

export function formatValue(
    value: number,
    unit: ChartUnit | 'count' | 'bytes'
): string {
    switch (unit) {
        case 'bytes':
            return formatBytes(value);
        case 'ratio':
            return `${Math.round(value * 1000) / 10}%`;
        case 'ms':
            return `${Math.round(value)}`;
        case 'seconds':
            return `${Math.round(value)}`;
        case 'perMin':
            return String(Number(value.toFixed(value >= 10 ? 0 : 2)));
        default:
            return formatCount(value);
    }
}

export type AgeUnit = 'seconds' | 'minutes' | 'hours';

export function splitAge(seconds: number): { unit: AgeUnit; value: number } {
    if (seconds < 90) return { unit: 'seconds', value: Math.round(seconds) };

    if (seconds < 90 * 60)
        return { unit: 'minutes', value: Math.round(seconds / 60) };

    return { unit: 'hours', value: Math.round(seconds / 3600) };
}
