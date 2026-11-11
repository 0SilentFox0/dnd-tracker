import type { z } from "zod";

// <systems:generated>
import { WFRP_EFFECT_SCHEMAS } from "@/systems/wfrp/rules/ability-effects";
// </systems:generated>

const SYSTEM_EFFECT_SCHEMA_LISTS = [
  // <systems:generated>
  WFRP_EFFECT_SCHEMAS,
  // </systems:generated>
] as const;

export const SYSTEM_EFFECT_SCHEMAS = SYSTEM_EFFECT_SCHEMA_LISTS.flat();

export type SystemEffect = z.infer<(typeof SYSTEM_EFFECT_SCHEMAS)[number]>;
