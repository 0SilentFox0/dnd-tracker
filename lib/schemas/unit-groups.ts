import { z } from 'zod';

import { isHttpUrl } from '@/lib/utils/common/image-url';

export const UnitGroupAppearanceSchema = z.strictObject({
    name: z.string().trim().min(1).max(100).optional(),
    icon: z.string().trim().max(2000).refine(isHttpUrl).nullable().optional(),
});

export const UnitGroupAppearancesSchema = z.record(
    z.string().min(1).max(200),
    UnitGroupAppearanceSchema
);

export type UnitGroupAppearance = z.infer<typeof UnitGroupAppearanceSchema>;
