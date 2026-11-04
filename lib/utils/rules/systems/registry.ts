import { d20System } from "./d20";
import type { RuleSystemDefinition, RuleSystemKey } from "./types";
import { WFRP_SYSTEM } from "./wfrp";

import type { Ruleset } from "@/lib/utils/rules/schema";

export const RULE_SYSTEM_REGISTRY: Record<RuleSystemKey, RuleSystemDefinition> = {
  homm: d20System("homm"),
  dnd5e: d20System("dnd5e"),
  wfrp: WFRP_SYSTEM,
};

export const ruleSystemOf = (rules: Pick<Ruleset, "system">): RuleSystemDefinition => RULE_SYSTEM_REGISTRY[rules.system.key];

export const systemKeyOf = (rules: Pick<Ruleset, "system">): RuleSystemKey => rules.system.key;
