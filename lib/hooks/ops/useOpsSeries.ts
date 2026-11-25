'use client';

import { useQuery } from '@tanstack/react-query';

import { opsKeys } from './keys';
import { OPS_REFETCH_MS } from './useOpsSummary';

import { getOpsSeries } from '@/lib/api/ops';
import type { OpsRange } from '@/types/ops';

export function useOpsSeries(range: OpsRange, metrics: string[]) {
    return useQuery({
        queryKey: opsKeys.series(range, metrics),
        queryFn: () => getOpsSeries(range, metrics),
        staleTime: 10_000,
        refetchInterval: OPS_REFETCH_MS,
        refetchIntervalInBackground: false,
        placeholderData: (prev) => prev,
    });
}
