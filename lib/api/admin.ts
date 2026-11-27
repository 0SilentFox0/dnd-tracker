import { request } from './client';

import type {
    AdminCampaignSummary,
    AdminOverview,
    AdminRange,
    AdminUserDetail,
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

export const getAdminUser = (id: string) =>
    request<AdminUserDetail>(`/api/admin/users/${encodeURIComponent(id)}`);

export const getAdminCampaign = (id: string) =>
    request<AdminCampaignSummary>(
        `/api/admin/campaigns/${encodeURIComponent(id)}`
    );

const userUrl = (id: string) => `/api/admin/users/${encodeURIComponent(id)}`;

const post = (url: string, body?: unknown) =>
    request<{ ok: true }>(url, {
        method: 'POST',
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

export const banAdminUser = (id: string, hours: 24 | 168 | 876000) =>
    post(`${userUrl(id)}/ban`, { hours });

export const unbanAdminUser = (id: string) => post(`${userUrl(id)}/unban`);

export const signOutAdminUser = (id: string) => post(`${userUrl(id)}/signout`);

export const deleteAdminUser = (id: string, email: string) =>
    request<{ ok: true }>(userUrl(id), {
        method: 'DELETE',
        body: JSON.stringify({ email }),
    });
