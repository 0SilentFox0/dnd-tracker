'use client';

import { useQuery } from '@tanstack/react-query';

import { opsKeys } from './keys';
import { OPS_REFETCH_MS } from './useOpsSummary';

import { getOpsAlerts, getOpsDbTop } from '@/lib/api/ops';

export function useOpsAlerts() {
    return useQuery({
        queryKey: opsKeys.alerts(),
        queryFn: getOpsAlerts,
        staleTime: 10_000,
        refetchInterval: OPS_REFETCH_MS,
        refetchIntervalInBackground: false,
    });
}

export function useOpsDbTop() {
    return useQuery({
        queryKey: opsKeys.dbTop(),
        queryFn: getOpsDbTop,
        staleTime: 30_000,
        refetchInterval: OPS_REFETCH_MS * 4,
        refetchIntervalInBackground: false,
    });
}
