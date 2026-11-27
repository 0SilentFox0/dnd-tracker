'use client';

import { useQuery } from '@tanstack/react-query';

import { adminKeys } from './keys';

import { getAdminUser } from '@/lib/api/admin';

export function useAdminUser(id: string) {
    return useQuery({
        queryKey: adminKeys.user(id),
        queryFn: () => getAdminUser(id),
        refetchOnWindowFocus: false,
    });
}
