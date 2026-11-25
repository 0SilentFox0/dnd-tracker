import type { ProviderName } from '@/lib/ops/metrics-catalog';

type ProviderReading = { metric: string; value: number };

export type ProviderAdapter = {
    name: ProviderName;
    collect(): Promise<ProviderReading[] | 'unavailable'>;
};
