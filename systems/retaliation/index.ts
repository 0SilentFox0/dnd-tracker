import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

import { defineAddon } from "@/lib/utils/rules/systems/compose";

export const RETALIATION_MODULE = defineAddon<RuleSystemDefinition>(() => ({}));
