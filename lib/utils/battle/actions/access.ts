import type { Ruleset } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export const coreActionsOn = (rules?: Ruleset | null): boolean => !!rules && ruleSystemOf(rules).combat.actions.enabled(rules);

export const reactionBlockerOf = (rules: Ruleset | null | undefined, p: BattleParticipant): LogLine | null => (rules ? ruleSystemOf(rules).combat.reactions.blocker(p) : null);
