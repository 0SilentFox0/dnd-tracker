import { forbiddenTermIssues } from "../grim-d100/validate";
import type { Pack } from "../lib/pack";
import { D20_HOOKS } from "./d20";
import { HOMM_HOOKS } from "./homm";
import type { PackHooks, PackIssue } from "./types";
// <systems:generated>
import { WFRP_HOOKS } from "./wfrp";

import { SYSTEM_META } from "@/lib/utils/rules/systems/meta";
// </systems:generated>

export type { Glossary, PackHooks, PackIssue, PackRefs, PrepareCtx } from "./types";

/** Rule-system key -> module; an include may only pull rows from a pack of the same module. */
export const SYSTEM_MODULE: Readonly<Record<string, string>> = Object.fromEntries(SYSTEM_META.flatMap((meta) => meta.keys.map((key) => [key, meta.module])));

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
