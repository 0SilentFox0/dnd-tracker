import type { Ruleset } from "@/lib/utils/rules/schema";

export const stripPlayerHiddenRules = (rules: Ruleset): Ruleset => ({ ...rules, tables: {} });
