import type {
    LegendaryAttackInput,
    LegendaryAttackResult,
    MovementInput,
    MovementResult,
    RunCoreActionInput,
    RunCoreActionResult,
} from './types';

import { actionsOf } from '@/lib/utils/battle/actions/access';
import { resolveServerAttack } from '@/lib/utils/battle/attack/server-attack';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

type WithoutStrike<T> = Omit<T, 'strike'>;

export const runCoreAction = (
    input: WithoutStrike<RunCoreActionInput>
): RunCoreActionResult =>
    actionsOf(input.rules).run({
        ...input,
        strike: resolveServerAttack,
    });

export const legendaryAttack = (
    input: WithoutStrike<LegendaryAttackInput>
): LegendaryAttackResult =>
    actionsOf(input.rules).legendaryAttack({
        ...input,
        strike: resolveServerAttack,
        reach: ruleSystemOf(input.rules).combat.reach,
    });

export const moveWithReactions = (
    input: WithoutStrike<MovementInput>
): MovementResult =>
    actionsOf(input.rules).move({
        ...input,
        strike: resolveServerAttack,
    });
