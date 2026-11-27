'use client';

import { useQuery } from '@tanstack/react-query';

import { adminKeys } from './keys';

import { getAdminMe } from '@/lib/api/admin';

export function useIsAdmin(userId: string | undefined): boolean {
    const { data } = useQuery({
        queryKey: adminKeys.me(userId ?? ''),
        queryFn: getAdminMe,
        enabled: !!userId,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        retry: false,
    });

    return data?.isAdmin ?? false;
}
