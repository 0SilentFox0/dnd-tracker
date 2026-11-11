import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

import { defineAddon } from "@/lib/utils/rules/systems/compose";

export const HEROSCALING_MODULE = defineAddon<RuleSystemDefinition>(() => ({}));
