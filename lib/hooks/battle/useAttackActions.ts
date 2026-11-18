import type { Dispatch } from 'react';

import type { useBattleScene } from './useBattleScene';

import { findFlags } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { withSelf } from '@/lib/utils/abilities/engine/core/participants';
import type { StrikeRiderEffect } from '@/lib/utils/abilities/schema';
import { attackMaxTargets } from '@/lib/utils/battle/attack/max-targets';
import { damageDiceSlots } from '@/lib/utils/battle/damage/attack-parts';
import {
    type AttackFlowAction,
    type AttackFlowState,
    type AttackMode,
    forcedFor,
    type RollOutcome,
    rollOutcomeOf,
} from '@/lib/utils/battle/flows';
import { enemiesInReach } from '@/lib/utils/battle/grid';
import { cryptoRandom, rollDie } from '@/lib/utils/common/dice';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

type Scene = ReturnType<typeof useBattleScene>;

type RiderOffer = {
    toggle(current: string[], effect: string): string[];
};

export interface AttackActionsContext {
    attacker: BattleParticipant | null;
    attack: BattleAttack | null;
    pools: { main: BattleAttack[]; off: BattleAttack[] };
    flow: { state: AttackFlowState; dispatch: Dispatch<AttackFlowAction> };
    scene: Scene;
    targets: {
        enemies: BattleParticipant[];
        unreachable: Set<string>;
        visible(p: BattleParticipant): boolean;
    };
    cunningOffer: RiderOffer | null;
    mode: AttackMode;
    attackCtx: Parameters<typeof rollOutcomeOf>[3];
    serverJudged: boolean;
    dice: number;
}

export function useAttackActions({
    attacker,
    attack,
    pools: attackPools,
    flow: { state, dispatch },
    scene,
    targets: { enemies: enemyTargets, unreachable, visible },
    cunningOffer,
    mode: currentMode,
    attackCtx,
    serverJudged,
    dice,
}: AttackActionsContext) {
    const order = scene.battle.initiativeOrder;

    const byId = (id: string) => order.find((p) => p.basicInfo.id === id);

    const hitsAll =
        !!attacker &&
        findFlags(
            withSelf(order, attacker),
            attacker.basicInfo.id,
            'attackHitsAllEnemies'
        ).length > 0;

    const chain =
        !!attacker &&
        findFlags(withSelf(order, attacker), attacker.basicInfo.id, 'chainShot')
            .length > 0;

    const describe = (a: BattleAttack) => {
        const onMap = !!scene.battle.map && !!attacker?.battleData.position;

        const maxTargets = attacker
            ? attackMaxTargets(attacker, a, { chain, onMap })
            : 1;

        return {
            attackId: a.id ?? a.name,
            maxTargets: hitsAll
                ? Math.max(maxTargets, enemyTargets.length)
                : maxTargets,
            diceSlots: attacker
                ? damageDiceSlots(attacker, a, scene.battle.rules)
                : [6],
        };
    };

    const preselectAll = (chosen: BattleAttack) => {
        if (!hitsAll) return;

        const inReach =
            attacker && scene.battle.map && attacker.battleData.position
                ? enemiesInReach(
                      scene.battle.map,
                      order,
                      attacker,
                      chosen,
                      scene.battle.rules
                  ).filter(visible)
                : enemyTargets;

        dispatch({
            type: 'SET_TARGETS',
            ids: inReach.map((p) => p.basicInfo.id),
        });
    };


    const outcomeOf = (d20: number, second?: number): RollOutcome => {
        const target = byId(state.strikes[state.index]?.targetId ?? '');

        if (!attacker || !attack || !target) return 'miss';

        return rollOutcomeOf(attacker, target, attack, attackCtx, {
            d20,
            second,
            mode: currentMode,
        });
    };

    const rollAction = (d20?: number, second?: number): AttackFlowAction =>
        serverJudged
            ? {
                  type: 'ROLL',
                  d20,
                  outcome: 'hit',
                  judge: 'server',
                  damage: state.diceSlots.map((sides) =>
                      rollDie(sides, cryptoRandom)
                  ),
                  ...(second !== undefined && { second }),
              }
            : {
                  type: 'ROLL',
                  d20,
                  second,
                  outcome: outcomeOf(d20 ?? 0, second),
              };

    return {
        open: (
            targetId?: string,
            attackId?: string,
            opts: { offHand?: boolean } = {}
        ) => {
            const offHand = !!opts.offHand;

            const pool = offHand ? attackPools.off : attackPools.main;

            const first = pool[0];

            if (!first) return;

            const target = targetId ? byId(targetId) : undefined;

            if (!target) {
                dispatch({
                    type: 'OPEN',
                    weaponCount: pool.length,
                    ...describe(first),
                    ...(offHand && { offHand }),
                });
                preselectAll(first);

                return;
            }

            const chosen =
                (attackId && pool.find((a) => (a.id ?? a.name) === attackId)) ||
                first;

            const picked = pool.length === 1 || !!attackId;

            dispatch({
                type: 'OPEN',
                weaponCount: pool.length,
                ...describe(chosen),
                targetIds: [target.basicInfo.id],
                picked,
                ...(offHand && { offHand }),
            });

            if (picked) {
                if (pool.length > 1)
                    dispatch({ type: 'SELECT_WEAPON', ...describe(chosen) });

                const forced = attacker
                    ? forcedFor(attacker, target, chosen, attackCtx)
                    : undefined;

                dispatch({
                    type: 'CONFIRM_TARGETS',
                    forced: { [target.basicInfo.id]: forced },
                });
            }
        },
        changeWeapon: () => dispatch({ type: 'CHANGE_WEAPON' }),
        selectWeapon: (a: BattleAttack) => {
            dispatch({ type: 'SELECT_WEAPON', ...describe(a) });
            preselectAll(a);
        },
        toggleTarget: (id: string) => dispatch({ type: 'TOGGLE_TARGET', id }),
        confirmTargets: () => {
            const forced = Object.fromEntries(
                state.targetIds.map((id) => {
                    const t = byId(id);

                    return [
                        id,
                        attacker && attack && t
                            ? forcedFor(attacker, t, attack, attackCtx)
                            : undefined,
                    ];
                })
            );

            dispatch({ type: 'CONFIRM_TARGETS', forced });
        },
        selectAllEnemies: () =>
            dispatch({
                type: 'SET_TARGETS',
                ids: enemyTargets
                    .filter((p) => !unreachable.has(p.basicInfo.id))
                    .map((p) => p.basicInfo.id),
            }),
        toggleCunning: (effect: StrikeRiderEffect) =>
            cunningOffer &&
            dispatch({
                type: 'SET_CUNNING_STRIKE',
                effects: cunningOffer.toggle(
                    state.cunningStrike ?? [],
                    effect
                ) as StrikeRiderEffect[],
            }),
        setMode: (mode: AttackMode) => dispatch({ type: 'SET_MODE', mode }),
        setSystemInput: (value: SystemSlot | null) =>
            dispatch({ type: 'SET_SYSTEM_INPUT', value }),
        setInspiration: (value: boolean) => {
            const t = byId(state.strikes[0]?.targetId ?? '');

            const forced =
                attacker && attack && t
                    ? forcedFor(attacker, t, attack, attackCtx, {
                          inspiration: value,
                      })
                    : undefined;

            dispatch({ type: 'SET_INSPIRATION', value, forced });
        },
        roll: (d20: number, second?: number) =>
            dispatch(rollAction(d20, second)),
        aiRoll: () => {
            if (serverJudged) return dispatch(rollAction());

            const d20 = rollDie(dice, cryptoRandom);

            const second =
                currentMode === 'normal'
                    ? undefined
                    : rollDie(dice, cryptoRandom);

            dispatch(rollAction(d20, second));
        },
        damage: (values: number[]) => dispatch({ type: 'DAMAGE', values }),
        back: () => dispatch({ type: 'BACK' }),
        submit: () => dispatch({ type: 'SUBMIT' }),
        close: () => dispatch({ type: 'CLOSE' }),
    };
}
