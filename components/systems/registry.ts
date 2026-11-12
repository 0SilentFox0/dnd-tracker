import { composeUi } from "./compose";
import type { SystemUi } from "./types";

import { RULE_SYSTEM_KEYS } from "@/lib/utils/rules/systems/meta";
import { type ModuleEntry, resolveSystem } from "@/lib/utils/rules/systems/resolve";
// <systems:generated>
import { D20_MODULE_UI } from "@/systems/d20/ui";
import { HEROSCALING_MODULE_UI } from "@/systems/heroscaling/ui";
import { MORALE_MODULE_UI } from "@/systems/morale/ui";
import { WFRP_MODULE_UI } from "@/systems/wfrp/ui";
// </systems:generated>

export const MODULE_UI: Record<string, ModuleEntry<SystemUi>> = {
  // <systems:generated>
  d20: D20_MODULE_UI,
  heroscaling: HEROSCALING_MODULE_UI,
  morale: MORALE_MODULE_UI,
  wfrp: WFRP_MODULE_UI,
  // </systems:generated>
};

const uiCache = new Map<string, SystemUi>();

const resolve = (key: string, modules?: readonly string[]): SystemUi => resolveSystem({ key, modules }, uiCache, { entries: MODULE_UI, optional: true, compose: composeUi });

export const SYSTEM_UI: Record<string, SystemUi> = Object.fromEntries(RULE_SYSTEM_KEYS.map((key) => [key, resolve(key)]));

export const systemUiOf = (key: string, modules?: readonly string[]): SystemUi => {
  if (!modules && Object.hasOwn(SYSTEM_UI, key)) return SYSTEM_UI[key];

  return resolve(key, modules);
};

export const systemUiByKey = (key: string): SystemUi | undefined => (Object.hasOwn(SYSTEM_UI, key) ? SYSTEM_UI[key] : undefined);
