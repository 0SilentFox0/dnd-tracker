import { HOMM_RULES_PRESET } from "./rules/rules-preset";

import { defineAddon } from "@/lib/utils/rules/systems/compose";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

export { HOMM_RULES_PRESET };

export const HOMM_MODULE = defineAddon<RuleSystemDefinition>(() => ({}));
