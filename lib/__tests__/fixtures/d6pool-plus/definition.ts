import { D6POOL_SLOT, D6POOL_SYSTEM } from '../d6pool/definition';

import type { AddonBuilder } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export interface D6Turn {
    pool: number;
    log: readonly string[];
}

export type TurnHook = (state: D6Turn) => D6Turn;

/** The contract has no turn hooks yet: the fixture carries a hook list the composer folds like any other list */
export type D6TurnSystem = RuleSystemDefinition & {
    turn: {
        onTurnStart: readonly TurnHook[];
        order: (ids: readonly string[]) => string[];
    };
};

const hook =
    (name: string, gain: number): TurnHook =>
    (state) => ({ pool: state.pool + gain, log: [...state.log, name] });

export const D6POOL_TURN_SYSTEM: D6TurnSystem = {
    ...D6POOL_SYSTEM,
    turn: { onTurnStart: [hook('base', 1)], order: (ids) => [...ids] },
};

export const D6POOL_PLUS_MODULE: AddonBuilder<D6TurnSystem> = () => ({
    turn: { onTurnStart: [hook('plus', 2)] },
});

export interface D6PlusData {
    focus: number;
}

export const D6POOL_PLUS_SLOT = D6POOL_SLOT.extend<D6PlusData>(
    'd6pool-plus',
    (raw) =>
        raw &&
        typeof raw === 'object' &&
        typeof (raw as D6PlusData).focus === 'number'
            ? (raw as D6PlusData)
            : undefined
);

export const runTurnStart = (system: D6TurnSystem, pool: number): D6Turn =>
    system.turn.onTurnStart.reduce((state, h) => h(state), {
        pool,
        log: [] as readonly string[],
    });
