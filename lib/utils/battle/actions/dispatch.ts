import type {
    LegendaryAttackInput,
    LegendaryAttackResult,
    MovementInput,
    MovementResult,
    RunCoreActionInput,
    RunCoreActionResult,
} from './types';

import { resolveServerAttack } from '@/lib/utils/battle/attack/server-attack';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

type WithoutStrike<T> = Omit<T, 'strike'>;

export const runCoreAction = (
    input: WithoutStrike<RunCoreActionInput>
): RunCoreActionResult =>
    ruleSystemOf(input.rules).combat.actions.run({
        ...input,
        strike: resolveServerAttack,
    });

export const legendaryAttack = (
    input: WithoutStrike<LegendaryAttackInput>
): LegendaryAttackResult =>
    ruleSystemOf(input.rules).combat.actions.legendaryAttack({
        ...input,
        strike: resolveServerAttack,
    });

export const moveWithReactions = (
    input: WithoutStrike<MovementInput>
): MovementResult =>
    ruleSystemOf(input.rules).combat.actions.move({
        ...input,
        strike: resolveServerAttack,
    });
