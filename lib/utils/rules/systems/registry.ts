import { d20System } from "./d20";
import type { RuleSystemDefinition } from "./types";

import { type Coin, COIN_VALUE } from "@/lib/constants/inventory";
import type { Ruleset } from "@/lib/utils/rules/schema";
// <systems:generated>
import { WFRP_SYSTEM } from "@/systems/wfrp";
// </systems:generated>

export const RULE_SYSTEM_REGISTRY: Record<string, RuleSystemDefinition> = {
  homm: d20System("homm"),
  dnd5e: d20System("dnd5e"),
  // <systems:generated>
  wfrp: WFRP_SYSTEM,
  // </systems:generated>
};

export const isEmptySystemData = (value: unknown): boolean => Object.values(RULE_SYSTEM_REGISTRY).some((system) => system.characteristics.isEmpty(value));

export const ruleSystemOf = (rules: Pick<Ruleset, "system">): RuleSystemDefinition => {
  const system = ruleSystemByKey(rules.system.key);

  if (!system) throw new Error(`Unknown rule system: ${rules.system.key}`);

  return system;
};

export const systemKeyOf = (rules: Pick<Ruleset, "system">): string => rules.system.key;

export const currencyValueOf = (rules: Pick<Ruleset, "system">): Record<Coin, number> => ruleSystemOf(rules).currency?.value ?? COIN_VALUE;

export const ruleSystemByKey = (key: string): RuleSystemDefinition | undefined => (Object.hasOwn(RULE_SYSTEM_REGISTRY, key) ? RULE_SYSTEM_REGISTRY[key] : undefined);
