import { composeUi } from "./compose";
import { D20_UI } from "./d20";
import type { SystemUi } from "./types";

import { RULE_SYSTEM_KEYS } from "@/lib/utils/rules/systems/meta";
import { type ModuleEntry, resolveSystem } from "@/lib/utils/rules/systems/resolve";
// <systems:generated>
import { WFRP_MODULE_UI } from "@/systems/wfrp/ui";
// </systems:generated>

export const MODULE_UI: Record<string, ModuleEntry<SystemUi>> = {
  // <systems:generated>
  wfrp: WFRP_MODULE_UI,
  // </systems:generated>
};

const uiCache = new Map<string, SystemUi>();

const resolve = (key: string, modules?: readonly string[]): SystemUi => resolveSystem({ key, modules }, uiCache, { entries: MODULE_UI, fallbackBase: () => D20_UI, compose: composeUi });

export const SYSTEM_UI: Record<string, SystemUi> = Object.fromEntries(RULE_SYSTEM_KEYS.map((key) => [key, resolve(key)]));

export const systemUiOf = (key: string, modules?: readonly string[]): SystemUi => {
  if (!modules && Object.hasOwn(SYSTEM_UI, key)) return SYSTEM_UI[key];

  return resolve(key, modules);
};

export const systemUiByKey = (key: string): SystemUi | undefined => (Object.hasOwn(SYSTEM_UI, key) ? SYSTEM_UI[key] : undefined);
