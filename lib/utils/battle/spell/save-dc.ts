import type { AbilityKey } from "@/lib/constants/abilities";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleParticipant } from "@/types/battle";

export const spellSaveDc = (rules: Ruleset, caster: BattleParticipant, ability?: AbilityKey): number => ruleSystemOf(rules).magic.saveDc(caster, ability, rules.formulas.saveDcBase);
