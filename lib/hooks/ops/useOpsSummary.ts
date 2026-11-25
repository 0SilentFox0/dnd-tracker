'use client';

import { useQuery } from '@tanstack/react-query';

import { opsKeys } from './keys';

import { getOpsSummary } from '@/lib/api/ops';

export const OPS_REFETCH_MS = 15_000;

export function useOpsSummary() {
    return useQuery({
        queryKey: opsKeys.summary(),
        queryFn: getOpsSummary,
        staleTime: 10_000,
        refetchInterval: OPS_REFETCH_MS,
        refetchIntervalInBackground: false,
    });
}
