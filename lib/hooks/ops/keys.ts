import type { OpsRange } from '@/types/ops';

export const opsKeys = {
    all: ['ops'] as const,
    summary: () => ['ops', 'summary'] as const,
    series: (range: OpsRange, metrics: string[]) =>
        ['ops', 'series', range, metrics.join(',')] as const,
    alerts: () => ['ops', 'alerts'] as const,
    dbTop: () => ['ops', 'db-top'] as const,
};
