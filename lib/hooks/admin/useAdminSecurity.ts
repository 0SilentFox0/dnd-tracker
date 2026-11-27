'use client';

import { useQuery } from '@tanstack/react-query';

import { adminKeys } from './keys';

import { getAdminSecurity } from '@/lib/api/admin';

export function useAdminSecurity(days: number) {
    return useQuery({
        queryKey: adminKeys.security(days),
        queryFn: () => getAdminSecurity(days),
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });
}
