import { noActions, noReactions } from './none';

import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export const NO_ACTION_ECONOMY = { bonusAction: false, reaction: false };

export const actionsOf = (rules: Pick<Ruleset, 'system'>) =>
    ruleSystemOf(rules).combat.actions ?? noActions;

export const reactionsOf = (rules: Pick<Ruleset, 'system'>) =>
    ruleSystemOf(rules).combat.reactions ?? noReactions;

export const actionEconomyOf = (rules: Pick<Ruleset, 'system'>) =>
    ruleSystemOf(rules).combat.actionEconomy ?? NO_ACTION_ECONOMY;

export const coreActionsOn = (rules?: Ruleset | null): boolean =>
    !!rules && actionsOf(rules).enabled(rules);

export const reactionBlockerOf = (
    rules: Ruleset | null | undefined,
    p: BattleParticipant
): LogLine | null => (rules ? reactionsOf(rules).blocker(p) : null);
