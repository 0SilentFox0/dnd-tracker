import { D20_UI } from "./d20";
import type { SystemUi } from "./types";

// <systems:generated>
import { WFRP_UI } from "@/systems/wfrp/ui";
// </systems:generated>

export const SYSTEM_UI: Record<string, SystemUi> = {
  homm: D20_UI,
  dnd5e: D20_UI,
  // <systems:generated>
  wfrp: WFRP_UI,
  // </systems:generated>
};

export const systemUiOf = (key: string): SystemUi => SYSTEM_UI[key];

export const systemUiByKey = (key: string): SystemUi | undefined => (Object.hasOwn(SYSTEM_UI, key) ? SYSTEM_UI[key] : undefined);
