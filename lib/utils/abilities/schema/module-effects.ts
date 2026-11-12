import type { z } from "zod";

// <systems:generated>
import { MORALE_MODULE_EFFECT_SCHEMAS } from "@/systems/morale/rules/ability-module-effects";
// </systems:generated>

const MODULE_EFFECT_SCHEMA_LISTS = [
  // <systems:generated>
  MORALE_MODULE_EFFECT_SCHEMAS,
  // </systems:generated>
] as const;

export const MODULE_EFFECT_SCHEMAS = MODULE_EFFECT_SCHEMA_LISTS.flat();

export type ModuleEffectKind = z.infer<(typeof MODULE_EFFECT_SCHEMAS)[number]>["kind"];
