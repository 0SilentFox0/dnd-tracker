export const RULES_EDITIONS = ["2014", "2024"] as const;

export type RulesEdition = (typeof RULES_EDITIONS)[number];

export const DEFAULT_RULES_EDITION: RulesEdition = "2014";

export const RULE_SYSTEM_KEYS = ["homm", "dnd5e", "wfrp"] as const;

export type RuleSystemKey = (typeof RULE_SYSTEM_KEYS)[number];
