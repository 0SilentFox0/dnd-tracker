import { z } from 'zod';

export const ADMIN_RANGES = ['7d', '30d', '90d'] as const;

export const adminRangeSchema = z.enum(ADMIN_RANGES);

export const adminOverviewQuerySchema = z.object({
    range: adminRangeSchema.default('30d'),
});

export const ADMIN_USER_SORTS = ['created', 'active', 'campaigns'] as const;

export const ADMIN_USER_FILTERS = [
    'all',
    'banned',
    'sharedIp',
    'inactive',
    'noCampaigns',
    'aiKey',
] as const;

export const adminUsersQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    sort: z.enum(ADMIN_USER_SORTS).default('created'),
    filter: z.enum(ADMIN_USER_FILTERS).default('all'),
    cursor: z.string().optional(),
});
