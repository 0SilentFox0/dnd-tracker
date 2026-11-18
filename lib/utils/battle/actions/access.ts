import { noActions, noLair, noReactions } from './none';

import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import {
    moduleVocab,
    type ModuleVocabId,
} from '@/lib/utils/rules/systems/vocab';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export const NO_ACTION_ECONOMY = { bonusAction: false, reaction: false };

export const actionsOf = (rules: Pick<Ruleset, 'system'>) =>
    ruleSystemOf(rules).combat.actions ?? noActions;

export const reactionsOf = (rules: Pick<Ruleset, 'system'>) =>
    ruleSystemOf(rules).combat.reactions ?? noReactions;

export const actionEconomyOf = (rules: Pick<Ruleset, 'system'>) =>
    ruleSystemOf(rules).combat.actionEconomy ?? NO_ACTION_ECONOMY;

export const sceneActionsOf = (rules: Pick<Ruleset, 'system'>) =>
    ruleSystemOf(rules).combat.sceneActions ?? noLair;

export { sceneActionsOf as lairOf };

/** Option kind a legendary-pool ability is used under: a module scene kind when its limit flag is set, else plain `ability` */
export const legendaryKindOf = (a: {
    limits?: object;
}): 'ability' | ModuleVocabId<'legendaryKinds'> => {
    const flags = a.limits as Record<string, unknown> | undefined;

    const kind = moduleVocab('legendaryKinds').find((k) => flags?.[k.id]);

    return (kind?.id as ModuleVocabId<'legendaryKinds'> | undefined) ?? 'ability';
};

export const coreActionsOn = (rules?: Ruleset | null): boolean =>
    !!rules && actionsOf(rules).enabled(rules);

export const reactionBlockerOf = (
    rules: Ruleset | null | undefined,
    p: BattleParticipant
): LogLine | null => (rules ? reactionsOf(rules).blocker(p) : null);
