import type { z } from 'zod';

// <systems:generated>
import { D20_FLAG_SCHEMAS } from '@/systems/d20/rules/ability-flags';
import { MORALE_FLAG_SCHEMAS } from '@/systems/morale/rules/ability-flags';
import { RETALIATION_FLAG_SCHEMAS } from '@/systems/retaliation/rules/ability-flags';
// </systems:generated>

const SYSTEM_FLAG_SCHEMA_LISTS = [
    // <systems:generated>
    D20_FLAG_SCHEMAS,
    MORALE_FLAG_SCHEMAS,
    RETALIATION_FLAG_SCHEMAS,
    // </systems:generated>
] as const;

export const SYSTEM_FLAG_SCHEMAS = SYSTEM_FLAG_SCHEMA_LISTS.flat();

export type SystemFlagKey = z.infer<
    (typeof SYSTEM_FLAG_SCHEMAS)[number]
>['flag'];
