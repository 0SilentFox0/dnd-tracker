import { canCastBonusSpell } from './hero';

import { actionsOf } from '@/lib/utils/battle/actions/access';
import { canAttackFromPool } from '@/lib/utils/battle/attack/attacks-left';
import { canOffHandAttack } from '@/lib/utils/battle/attack/off-hand';
import { remainingMovement } from '@/lib/utils/battle/grid/path';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';

type BonusSpell = Parameters<typeof canCastBonusSpell>[1][number];

export function turnExhausted(
    p: BattleParticipant,
    bonusSpells: BonusSpell[],
    rules: Ruleset,
    {
        canReturn = false,
        coreActions = false,
        gear = false,
    }: { canReturn?: boolean; coreActions?: boolean; gear?: boolean } = {}
): boolean {
    const bonusLeft =
        (p.battleData.resolvedAbilities ?? []).some(
            (a) => a.trigger.event === 'bonusAction'
        ) && !p.actionFlags.hasUsedBonusAction;

    return (
        p.actionFlags.hasUsedAction &&
        !canAttackFromPool(p) &&
        !bonusLeft &&
        !canOffHandAttack(p, rules) &&
        !canCastBonusSpell(p, bonusSpells) &&
        !(gear && !p.actionFlags.hasUsedBonusAction) &&
        !canReturn &&
        !(!!p.battleData.position && remainingMovement(p, rules) > 0) &&
        !(coreActions && actionsOf(rules).canStandUp(p, rules))
    );
}
