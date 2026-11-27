import { z } from 'zod';

export const ADMIN_RANGES = ['7d', '30d', '90d'] as const;

export const adminRangeSchema = z.enum(ADMIN_RANGES);

export const adminOverviewQuerySchema = z.object({
    range: adminRangeSchema.default('30d'),
});
