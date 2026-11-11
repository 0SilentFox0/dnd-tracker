import { forbiddenTermIssues } from "../grim-d100/validate";
import type { Pack } from "../lib/pack";
import { D20_HOOKS } from "./d20";
import { HOMM_HOOKS } from "./homm";
import { SYSTEM_MODULE } from "./modules";
import type { PackHooks, PackIssue } from "./types";
// <systems:generated>
import { WFRP_HOOKS } from "./wfrp";
// </systems:generated>

export { SYSTEM_MODULE };

export type { Glossary, PackHooks, PackIssue, PackRefs, PrepareCtx } from "./types";

export const PACK_HOOKS: Readonly<Record<string, PackHooks>> = {
  homm: { ...D20_HOOKS, ...HOMM_HOOKS },
  dnd5e: D20_HOOKS,
  // <systems:generated>
  wfrp: WFRP_HOOKS,
  // </systems:generated>
};

export const PACK_ADAPTERS: Readonly<Record<string, { validate?(pack: Pack): PackIssue[] }>> = {
  "grim-d100": { validate: forbiddenTermIssues },
};
