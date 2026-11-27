import type { AdminRange } from '@/types/admin';

export const adminKeys = {
    all: ['admin'] as const,
    me: ['admin', 'me'] as const,
    overview: (range: AdminRange) => ['admin', 'overview', range] as const,
    users: (params: unknown) => ['admin', 'users', params] as const,
    user: (id: string) => ['admin', 'user', id] as const,
    campaign: (id: string) => ['admin', 'campaign', id] as const,
    security: (days: number) => ['admin', 'security', days] as const,
};
