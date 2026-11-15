import type { Prisma } from '@prisma/client';

import { splitColumnView } from '@/lib/utils/rules/systems/column-view';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export function characteristicsPatch(
    fields: Record<string, unknown>,
    system: RuleSystemDefinition,
    prev: unknown
): { characteristics?: Prisma.InputJsonObject } {
    const { characteristics } = splitColumnView(fields, system, prev);

    return characteristics
        ? { characteristics: characteristics as Prisma.InputJsonObject }
        : {};
}
