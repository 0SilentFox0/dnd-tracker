'use client';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { adminKeys } from './keys';

import { getAdminUsers } from '@/lib/api/admin';
import type { AdminUsersQuery } from '@/types/admin';

export function useAdminUsers(query: Omit<AdminUsersQuery, 'cursor'>) {
    return useInfiniteQuery({
        queryKey: adminKeys.users(query),
        queryFn: ({ pageParam }) => getAdminUsers(query, pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last) => last.next ?? undefined,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: false,
    });
}
