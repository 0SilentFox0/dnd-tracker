import { z } from 'zod';

import { parseSeriesKey } from '@/lib/utils/ops/series';

export const OPS_RANGES = ['1h', '6h', '24h', '7d'] as const;

export const MAX_SERIES_METRICS = 12;

export const opsSeriesQuerySchema = z.object({
    range: z.enum(OPS_RANGES),
    metrics: z
        .string()
        .transform((s) => s.split(',').filter(Boolean))
        .pipe(
            z
                .array(z.string())
                .min(1)
                .max(MAX_SERIES_METRICS)
                .refine((keys) => keys.every((k) => parseSeriesKey(k) !== null))
        ),
});

export const opsAlertsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const opsMuteSchema = z.object({
    minutes: z.union([z.literal(0), z.literal(60), z.literal(1440)]),
});
