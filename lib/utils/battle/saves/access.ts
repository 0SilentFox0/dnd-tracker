import type { Ruleset } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems";

export const savesOf = (rules: Ruleset) => ruleSystemOf(rules).combat.saves;

export const proficiencyOf = (rules: Ruleset) => ruleSystemOf(rules).combat.proficiency;
