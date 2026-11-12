import { heroDicePart } from "./rules/dice";

import { defineAddon } from "@/lib/utils/rules/systems/compose";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

export const HEROSCALING_MODULE = defineAddon<RuleSystemDefinition>(() => ({
  participant: { fromCharacter: [heroDicePart] },
}));
