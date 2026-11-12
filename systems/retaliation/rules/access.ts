import type { RetaliationRules } from "@/lib/utils/rules/legacy-sections";
import type { Ruleset } from "@/lib/utils/rules/section-shapes";

export const retaliationRules = ({ actions }: Ruleset): RetaliationRules => ({ retaliation: actions.retaliation });
