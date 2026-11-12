import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import { legendaryAttack } from '@/lib/utils/battle/actions/legendary-attack';
import { actionReason } from '@/lib/utils/battle/actions/reasons';
import { BattleRuleError } from '@/lib/utils/battle/store/errors';
import type {
    RuleSystemActions,
    RuleSystemReactions,
} from '@/lib/utils/rules/systems/types';

const disabled = (): never => {
    throw new BattleRuleError(
        'action_rejected',
        API_ERRORS.BATTLE_CORE_ACTIONS_DISABLED
    );
};

/** A system without core actions: the section is off, nothing to list or run; the legendary strike is a plain attack and still works */
export const noActions: RuleSystemActions = {
    enabled: () => false,
    catalog: {},
    cost: disabled,
    targets: () => [],
    available: () => ({
        ok: false,
        reason: textRef(API_ERRORS.BATTLE_CORE_ACTIONS_DISABLED),
    }),
    canStandUp: () => false,
    run: disabled,
    legendaryAttack,
    move: disabled,
    releaseInvalidGrapples: (participants) => ({ participants, messages: [] }),
};

export const noReactions: RuleSystemReactions = {
    blocker: () => actionReason('noReaction'),
};
