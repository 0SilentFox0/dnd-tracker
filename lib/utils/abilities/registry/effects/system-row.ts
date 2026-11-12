import type { FieldMeta } from '../fields';
import type { EffectApplyResult } from './types';

import type { Segment } from '@/lib/utils/abilities/segments';

export interface SystemEffectRegistryRow {
    kind: string;
    static: boolean;
    pickable?: false;
    fields: readonly FieldMeta[];
    describe: (effect: never) => Segment[];
    apply: (input: never) => EffectApplyResult;
}

export interface SystemEffectRowInput {
    kind: string;
    row: SystemEffectRegistryRow;
    defaults: Record<string, unknown>;
}

export interface SystemEffectRow extends SystemEffectRowInput {
    /** Owning module id, stamped at the generated root */
    system: string;
}

export const ownedBy = (
    system: string,
    rows: readonly SystemEffectRowInput[]
): SystemEffectRow[] => rows.map((row) => ({ ...row, system }));
