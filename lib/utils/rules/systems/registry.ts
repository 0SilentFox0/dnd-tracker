import { d20System } from "./d20";
import type { RuleSystemDefinition, RuleSystemKey } from "./types";

import { type Coin, COIN_VALUE } from "@/lib/constants/inventory";
import type { Ruleset } from "@/lib/utils/rules/schema";
// <systems:generated>
import { WFRP_SYSTEM } from "@/systems/wfrp";
// </systems:generated>

export const RULE_SYSTEM_REGISTRY: Record<RuleSystemKey, RuleSystemDefinition> = {
  homm: d20System("homm"),
  dnd5e: d20System("dnd5e"),
  // <systems:generated>
  wfrp: WFRP_SYSTEM,
  // </systems:generated>
};

export const ruleSystemOf = (rules: Pick<Ruleset, "system">): RuleSystemDefinition => RULE_SYSTEM_REGISTRY[rules.system.key];

export const systemKeyOf = (rules: Pick<Ruleset, "system">): RuleSystemKey => rules.system.key;

export const currencyValueOf = (rules: Pick<Ruleset, "system">): Record<Coin, number> => ruleSystemOf(rules).currency?.value ?? COIN_VALUE;
