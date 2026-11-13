import type { Career } from '@prisma/client';

import { careerTierSchema } from './schema';

import type { CareerData } from '@/systems/wfrp/rules/careers/types';

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
