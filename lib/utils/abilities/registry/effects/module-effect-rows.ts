import { ownedBy, type SystemEffectRow } from './system-row';

// <systems:generated>
import { MORALE_MODULE_EFFECT_ROWS } from '@/systems/morale/rules/ability-module-effect-rows';
// </systems:generated>

const MODULE_EFFECT_ROW_LISTS = [
    // <systems:generated>
    ownedBy('morale', MORALE_MODULE_EFFECT_ROWS),
    // </systems:generated>
] as const satisfies readonly (readonly SystemEffectRow[])[];

export const MODULE_EFFECT_ROWS: readonly SystemEffectRow[] =
    MODULE_EFFECT_ROW_LISTS.flat();

export const MODULE_EFFECT_DEFAULTS: Readonly<
    Record<string, Record<string, unknown>>
> = Object.fromEntries(MODULE_EFFECT_ROWS.map((r) => [r.kind, r.defaults]));
