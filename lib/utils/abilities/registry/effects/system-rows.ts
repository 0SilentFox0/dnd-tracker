import { ownershipOf } from "./ownership";
import type { SystemEffectRow, SystemEffectRowInput } from "./system-row";

// <systems:generated>
import { WFRP_EFFECT_ROWS } from "@/systems/wfrp/rules/ability-effect-rows";
// </systems:generated>

const ownedBy = (system: string, rows: readonly SystemEffectRowInput[]): SystemEffectRow[] => rows.map((row) => ({ ...row, system }));

const SYSTEM_EFFECT_ROW_LISTS = [
  // <systems:generated>
  ownedBy("wfrp", WFRP_EFFECT_ROWS),
  // </systems:generated>
] as const satisfies readonly (readonly SystemEffectRow[])[];

export const SYSTEM_EFFECT_ROWS: readonly SystemEffectRow[] = SYSTEM_EFFECT_ROW_LISTS.flat();

export const SYSTEM_EFFECT_DEFAULTS: Readonly<Record<string, Record<string, unknown>>> = Object.fromEntries(SYSTEM_EFFECT_ROWS.map((r) => [r.kind, r.defaults]));

const KINDS = new Set(SYSTEM_EFFECT_ROWS.map((r) => r.kind));

export const isSystemEffectKind = (kind: string): boolean => KINDS.has(kind);

export const SYSTEM_EFFECT_OWNERSHIP = ownershipOf(SYSTEM_EFFECT_ROWS);
