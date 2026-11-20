'use client';

import { useMemo, useReducer } from 'react';

import { useAttackActions } from './useAttackActions';
import { useAttackSteps } from './useAttackSteps';
import { useAttackSubmit } from './useAttackSubmit';
import { useAttackTargets } from './useAttackTargets';
import { useBattleRules } from './useBattleRules';
import { useBattleScene } from './useBattleScene';

import { AttackType } from '@/lib/constants/battle';
import type { StrikeRiderEffect } from '@/lib/utils/abilities/schema';
import { ammoStatus } from '@/lib/utils/battle/ammo';
import { attackCounter } from '@/lib/utils/battle/attack/attacks-left';
import { critDoublesDice } from '@/lib/utils/battle/attack/crit-dice';
import { canUseInspiration } from '@/lib/utils/battle/attack/inspiration';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import {
    attackFlow,
    initialAttackFlow,
    strikeMode,
} from '@/lib/utils/battle/flows';
import { canSeeExactStats, weaponPreview } from '@/lib/utils/battle/view';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

export function useAttackWizard(
    attacker: BattleParticipant | null,
    onDone?: () => void
) {
    const scene = useBattleScene();

    const { dice, serverJudged, sceneState } = useBattleRules();

    const [state, dispatch] = useReducer(attackFlow, initialAttackFlow);

    const order = scene.battle.initiativeOrder;

    const attackPools = useMemo(() => {
        const all = attacker?.battleData.attacks ?? [];

        return {
            main: all.filter((a) => a.hand !== 'off'),
            off: all.filter((a) => a.hand === 'off'),
        };
    }, [attacker]);

    const attacks = state.offHand ? attackPools.off : attackPools.main;

    const attack =
        attacks.find((a) => (a.id ?? a.name) === state.attackId) ?? null;

    const { targets, enemyTargets, cover, unreachable, visible } =
        useAttackTargets(attacker, attack, state.step);

    const byId = (id: string) => order.find((p) => p.basicInfo.id === id);

    const map = scene.battle.map;

    const { steps, estimate } = useAttackSteps({
        attacker,
        attack,
        state,
        cover,
        scene,
    });

    const isOpen = state.step !== 'closed';

    const previews = useMemo(
        () =>
            attacker && isOpen
                ? Object.fromEntries(
                      attacks.map((a) => [
                          a.id ?? a.name,
                          weaponPreview(attacker, a, scene.battle.rules, order),
                      ])
                  )
                : {},
        [attacker, attacks, order, isOpen, scene.battle.rules]
    );

    const attackTarget = ruleSystemOf(scene.battle.rules).combat.attackTarget;

    const judged = {
        target:
            serverJudged && attacker && attack
                ? (attackTarget?.(attacker, attack) ?? null)
                : null,
        sceneState,
        attackerSide: attacker?.basicInfo.side,
        weaponTargets:
            serverJudged && attacker && isOpen
                ? Object.fromEntries(
                      attacks.map((a) => [
                          a.id ?? a.name,
                          attackTarget?.(attacker, a)?.target,
                      ])
                  )
                : {},
    };

    const unknownDefense = state.strikes.some((s) => {
        const t = byId(s.targetId);

        return (
            (s.outcome === 'hit' || s.outcome === 'crit') &&
            !!t &&
            !canSeeExactStats(t, scene.viewer)
        );
    });

    const currentStrike = state.strikes[state.index];

    const currentMode = strikeMode(state, currentStrike);

    const attackCtx = {
        order,
        round: scene.battle.currentRound,
        map,
        rules: scene.battle.rules,
    };

    useAttackSubmit({ attacker, attack, flow: { state, dispatch }, onDone });

    const cunningOffer = useMemo(
        () =>
            attacker && !state.offHand && isOpen
                ? ruleSystemOf(
                      scene.battle.rules
                  ).combat.attack?.riderOptions?.(
                      attacker,
                      scene.battle.currentRound
                  )
                : null,
        [
            attacker,
            state.offHand,
            isOpen,
            scene.battle.currentRound,
            scene.battle.rules,
        ]
    );

    const view = {
        rules: scene.battle.rules,
        cunning: cunningOffer && {
            options: cunningOffer.options.map((o) => ({
                ...o,
                effect: o.effect as StrikeRiderEffect,
                selected: !!state.cunningStrike?.includes(
                    o.effect as StrikeRiderEffect
                ),
            })),
            maxEffects: cunningOffer.maxEffects,
            sneakDice: cunningOffer.sneakDice,
        },
        attacker,
        ammo: attacker
            ? Object.fromEntries(
                  attacks.flatMap((a) =>
                      a.id && a.ammo?.capacity
                          ? [
                                [
                                    a.id,
                                    {
                                        status: ammoStatus(attacker, a),
                                        left:
                                            attacker.battleData.ammo?.[a.id] ??
                                            a.ammo.capacity,
                                        capacity: a.ammo.capacity,
                                    },
                                ] as const,
                            ]
                          : []
                  )
              )
            : {},
        attack,
        attacks,
        targets,
        steps,
        estimate,
        cover,
        unreachable,
        unknownDefense,
        previews,
        dice,
        serverJudged,
        judged,
        attackKind: attack
            ? attackKindOf(attack.type) === AttackType.RANGED
                ? ('ranged' as const)
                : ('melee' as const)
            : null,
        reachChecked:
            !!scene.battle.map &&
            !!attacker?.battleData.position &&
            state.targetIds.every((id) => !!byId(id)?.battleData.position),
        rollMode: currentMode,
        forcedMode: currentStrike?.forced,
        inspirationAvailable: canUseInspiration(attacker, scene.battle.rules),
        offHand: !!state.offHand,
        counter:
            attacker && !state.offHand ? attackCounter(attacker, order) : null,
        canSelectAllEnemies:
            enemyTargets.length > 1 && state.maxTargets >= enemyTargets.length,
    };

    const actions = useAttackActions({
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
    });

    const doubled =
        state.step === 'damage' &&
        currentStrike?.outcome === 'crit' &&
        critDoublesDice(scene.battle.rules, true);

    return {
        state: doubled
            ? { ...state, diceSlots: [...state.diceSlots, ...state.diceSlots] }
            : state,
        view,
        actions,
    };
}
