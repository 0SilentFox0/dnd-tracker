import type { Prisma } from '@prisma/client';

import '@/lib/utils/rules/systems/registry';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import { splitColumnView } from '@/lib/utils/rules/systems/column-view';
import { ruleSystemOf } from '@/lib/utils/rules/systems/lookup';

type WithCharacteristics<T> = T & {
    characteristics?: Prisma.InputJsonObject;
};

export function d20RowData<T extends object>(
    data: T,
    prev?: unknown
): WithCharacteristics<T> {
    const { characteristics } = splitColumnView(
        data as Record<string, unknown>,
        ruleSystemOf(DEFAULT_RULES),
        prev
    );

    return characteristics
        ? {
              ...data,
              characteristics: characteristics as Prisma.InputJsonObject,
          }
        : data;
}
