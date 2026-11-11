import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

import { defineAddon } from "@/lib/utils/rules/systems/compose";

export const MORALE_MODULE = defineAddon<RuleSystemDefinition>(() => ({}));
