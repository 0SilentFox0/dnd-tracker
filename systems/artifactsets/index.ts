import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

import { defineAddon } from "@/lib/utils/rules/systems/compose";

export const ARTIFACTSETS_MODULE = defineAddon<RuleSystemDefinition>(() => ({}));
