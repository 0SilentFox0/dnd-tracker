import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

export function resetTurnState(
    p: BattleParticipant,
    opts: { rules: Ruleset; keepLegendary?: boolean }
): BattleParticipant['battleData'] {
    const base: BattleParticipant = {
        ...p,
        battleData: {
            ...p.battleData,
            retaliationsUsed: 0,
            ...(p.battleData.movementUsed && { movementUsed: 0 }),
            turnStartPosition: p.battleData.position,
            returnedThisTurn: undefined,
            extraMovement: undefined,
            readied: undefined,
            attacksLeft: undefined,
            ...(p.battleData.legendary &&
                !opts.keepLegendary && {
                    legendary: {
                        ...p.battleData.legendary,
                        actionsLeft: p.battleData.legendary.actions,
                    },
                }),
        },
    };

    const hooks = ruleSystemOf(opts.rules).combat.turn?.resetState ?? [];

    return hooks.reduce((acc, hook) => hook(acc, 'turn'), base).battleData;
}
