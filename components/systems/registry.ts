import { D20_UI } from "./d20";
import type { SystemUi } from "./types";

import type { RuleSystemKey } from "@/lib/utils/rules/systems";
import { WFRP_UI } from "@/systems/wfrp/ui";

export const SYSTEM_UI: Record<RuleSystemKey, SystemUi> = { homm: D20_UI, dnd5e: D20_UI, wfrp: WFRP_UI };

export const systemUiOf = (key: RuleSystemKey): SystemUi => SYSTEM_UI[key];
