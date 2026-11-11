import { forbiddenTermIssues } from "../grim-d100/validate";
import type { Pack } from "../lib/pack";
import { HOMM_HOOKS } from "./homm";
import type { PackHooks, PackIssue } from "./types";
import { WFRP_HOOKS } from "./wfrp";

export type { PackHooks, PackIssue, PackRefs } from "./types";

/** Rule-system key -> module; an include may only pull rows from a pack of the same module. */
export const SYSTEM_MODULE: Readonly<Record<string, string>> = { homm: "d20", dnd5e: "d20", wfrp: "wfrp" };

export const PACK_HOOKS: Readonly<Record<string, PackHooks>> = { homm: HOMM_HOOKS, dnd5e: {}, wfrp: WFRP_HOOKS };

export const PACK_ADAPTERS: Readonly<Record<string, { validate?(pack: Pack): PackIssue[] }>> = {
  "grim-d100": { validate: forbiddenTermIssues },
};
