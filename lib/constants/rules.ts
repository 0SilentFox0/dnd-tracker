export const RULES_EDITIONS = ["2014", "2024"] as const;

export type RulesEdition = (typeof RULES_EDITIONS)[number];

export const DEFAULT_RULES_EDITION: RulesEdition = "2014";
