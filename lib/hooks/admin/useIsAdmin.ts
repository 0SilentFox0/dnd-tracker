'use client';

import { useQuery } from '@tanstack/react-query';

import { adminKeys } from './keys';

import { getAdminMe } from '@/lib/api/admin';

export function useIsAdmin(enabled: boolean): boolean {
    const { data } = useQuery({
        queryKey: adminKeys.me,
        queryFn: getAdminMe,
        enabled,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        retry: false,
    });

    return data?.isAdmin ?? false;
}
