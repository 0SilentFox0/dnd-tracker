'use client';

import { useQuery } from '@tanstack/react-query';

import { adminKeys } from './keys';

import { getAdminOverview } from '@/lib/api/admin';
import type { AdminRange } from '@/types/admin';

export function useAdminOverview(range: AdminRange) {
    return useQuery({
        queryKey: adminKeys.overview(range),
        queryFn: () => getAdminOverview(range),
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });
}
