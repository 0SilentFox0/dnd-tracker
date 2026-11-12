import type { Career } from '@prisma/client';

import { careerTierSchema } from '@/lib/schemas/careers';
import type { CareerData } from '@/types/careers';

export function toCareerData(row: Career): CareerData {
    const tiers = Array.isArray(row.tiers)
        ? row.tiers
              .map((t) => careerTierSchema.safeParse(t))
              .filter((r) => r.success)
              .map((r) => r.data)
        : [];

    return {
        id: row.id,
        name: row.name,
        icon: row.icon,
        class: row.class,
        tiers,
    };
}
