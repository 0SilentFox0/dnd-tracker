import { movementBudget } from '@/lib/utils/battle/grid/path';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';

export const reactionAvailable = (p: BattleParticipant) =>
    !p.actionFlags.hasUsedReaction;

export const movementOf = (p: BattleParticipant, rules: Ruleset) => {
    const max = movementBudget(p, rules);

    if (!max) return undefined;

    return { used: p.battleData.movementUsed ?? 0, max };
};

export const showDock = (hero: BattleParticipant | null, readOnly: boolean) =>
    !!hero && !readOnly;
