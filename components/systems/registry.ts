import { D20_UI } from "./d20";
import type { SystemUi } from "./types";

import type { RuleSystemKey } from "@/lib/utils/rules/systems";
// <systems:generated>
import { WFRP_UI } from "@/systems/wfrp/ui";
// </systems:generated>

export const SYSTEM_UI: Record<RuleSystemKey, SystemUi> = {
  homm: D20_UI,
  dnd5e: D20_UI,
  // <systems:generated>
  wfrp: WFRP_UI,
  // </systems:generated>
};

export const systemUiOf = (key: RuleSystemKey): SystemUi => SYSTEM_UI[key];

export const systemUiByKey = (key: string): SystemUi | undefined => (Object.hasOwn(SYSTEM_UI, key) ? SYSTEM_UI[key as RuleSystemKey] : undefined);
