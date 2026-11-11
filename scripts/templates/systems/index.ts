/* eslint-disable simple-import-sort/imports -- the generated block must stay contiguous */
import { SYSTEM_MODULE, systemBases } from "@/scripts/templates/systems/modules";
import type { PackHooks, PackIssue } from "@/scripts/templates/systems/types";

import type { Pack } from "../lib/pack";
import { ADAPTERS } from "./adapters";
import { D20_HOOKS } from "./d20";
// <systems:generated>
import { HOMM_MODULE_HOOKS } from "./homm";
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
  homm: { ...D20_HOOKS, ...HOMM_MODULE_HOOKS },
  dnd5e: D20_HOOKS,
};

export const PACK_ADAPTERS: Readonly<Record<string, { validate?(pack: Pack): PackIssue[] }>> = ADAPTERS;
