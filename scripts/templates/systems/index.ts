import type { Pack } from "../lib/pack";
import { ADAPTERS } from "./adapters";
import { D20_HOOKS } from "./d20";
import { HOMM_HOOKS } from "./homm";
// <systems:generated>
import { HOMM_MODULE_HOOKS } from "./homm";
import { SYSTEM_MODULE, systemBases } from "./modules";
import type { PackHooks, PackIssue } from "./types";
import { WFRP_MODULE_HOOKS } from "./wfrp";
// </systems:generated>

export { SYSTEM_MODULE, systemBases };

export type { Glossary, PackHooks, PackIssue, PackRefs, PrepareCtx } from "./types";

export const MODULE_HOOKS: Readonly<Record<string, PackHooks>> = {
  // <systems:generated>
  homm: HOMM_MODULE_HOOKS,
  wfrp: WFRP_MODULE_HOOKS,
  // </systems:generated>
};

export const PACK_HOOKS: Readonly<Record<string, PackHooks>> = {
  ...MODULE_HOOKS,
  homm: { ...D20_HOOKS, ...HOMM_HOOKS },
  dnd5e: D20_HOOKS,
};

export const PACK_ADAPTERS: Readonly<Record<string, { validate?(pack: Pack): PackIssue[] }>> = ADAPTERS;
