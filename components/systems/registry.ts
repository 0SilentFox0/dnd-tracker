import { D20_UI } from "./d20";
import type { SystemUi } from "./types";
import { WFRP_UI } from "./wfrp";

import type { RuleSystemKey } from "@/lib/utils/rules/systems";

export const SYSTEM_UI: Record<RuleSystemKey, SystemUi> = { homm: D20_UI, dnd5e: D20_UI, wfrp: WFRP_UI };

export const systemUiOf = (key: RuleSystemKey): SystemUi => SYSTEM_UI[key];
