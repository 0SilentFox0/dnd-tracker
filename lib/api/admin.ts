import { request } from './client';

import type {
    AdminOverview,
    AdminRange,
    AdminUsersPage,
    AdminUsersQuery,
} from '@/types/admin';

export const getAdminMe = () => request<{ isAdmin: boolean }>('/api/admin/me');

export const getAdminOverview = (range: AdminRange) =>
    request<AdminOverview>(`/api/admin/overview?range=${range}`);

export const getAdminUsers = (
    query: Omit<AdminUsersQuery, 'cursor'>,
    cursor?: string
) => {
    const params = new URLSearchParams({
        sort: query.sort,
        filter: query.filter,
    });

    if (query.q) params.set('q', query.q);

    if (cursor) params.set('cursor', cursor);

    return request<AdminUsersPage>(`/api/admin/users?${params}`);
};
