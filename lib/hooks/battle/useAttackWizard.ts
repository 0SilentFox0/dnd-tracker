"use client";

import { useMemo, useReducer } from "react";

import { useAttackSubmit } from "./useAttackSubmit";
import { useAttackTargets } from "./useAttackTargets";
import { useBattleScene } from "./useBattleScene";

import { AttackType } from "@/lib/constants/battle";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { CunningStrikeEffect } from "@/lib/utils/abilities/schema";
import { attackCounter } from "@/lib/utils/battle/attack/attacks-left";
import { critDoublesDice } from "@/lib/utils/battle/attack/crit-dice";
import { CUNNING_STRIKE_LABELS, cunningStrikeOffer, toggleCunningStrike } from "@/lib/utils/battle/attack/cunning-strike";
import { canUseInspiration } from "@/lib/utils/battle/attack/inspiration";
import { attackMaxTargets } from "@/lib/utils/battle/attack/max-targets";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { damageDiceSlots } from "@/lib/utils/battle/damage/hero-damage";
import { attackFlow, type AttackMode, forcedFor, initialAttackFlow, type RollOutcome, rollOutcomeOf, strikeMode } from "@/lib/utils/battle/flows";
import { enemiesInReach } from "@/lib/utils/battle/grid";
import { canSeeExactStats, strikeDamageSteps, weaponPreview } from "@/lib/utils/battle/view";
import { cryptoRandom, rollDie } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

export function useAttackWizard(attacker: BattleParticipant | null, onDone?: () => void) {
  const scene = useBattleScene();

  const [state, dispatch] = useReducer(attackFlow, initialAttackFlow);

  const order = scene.battle.initiativeOrder;

  const attackPools = useMemo(() => {
    const all = attacker?.battleData.attacks ?? [];

    return { main: all.filter((a) => a.hand !== "off"), off: all.filter((a) => a.hand === "off") };
  }, [attacker]);

  const attacks = state.offHand ? attackPools.off : attackPools.main;

  const attack = attacks.find((a) => (a.id ?? a.name) === state.attackId) ?? null;

  const { targets, enemyTargets, cover, visible } = useAttackTargets(attacker, attack, state.step);

  const byId = (id: string) => order.find((p) => p.basicInfo.id === id);

  const map = scene.battle.map;

  const steps = useMemo<DamageStep[][]>(() => {
    if (!attacker || !attack || state.step !== "summary") return [];

    return state.strikes
      .filter((s) => s.outcome === "hit" || s.outcome === "crit")
      .map((s) => {
        const target = byId(s.targetId);

        if (!target) return [];

        return strikeDamageSteps({
          attacker,
          target,
          attack,
          damage: s.damage,
          isCritical: s.outcome === "crit",
          blockedByCover: cover.has(s.targetId),
          battle: { initiativeOrder: order, rules: scene.battle.rules, battleLog: scene.battle.battleLog, knowledge: scene.battle.knowledge },
          viewer: scene.viewer,
        });
      });
    // byId читає order, який уже в deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attacker, attack, state.step, state.strikes, order, scene.battle.rules, scene.battle.battleLog, scene.battle.knowledge, scene.viewer, cover]);

  const estimate = steps.reduce((sum, list) => sum + (list.at(-1)?.after ?? 0), 0);

  const isOpen = state.step !== "closed";

  const previews = useMemo(
    () => (attacker && isOpen ? Object.fromEntries(attacks.map((a) => [a.id ?? a.name, weaponPreview(attacker, a, order)])) : {}),
    [attacker, attacks, order, isOpen],
  );

  const unknownDefense = state.strikes.some((s) => {
    const t = byId(s.targetId);

    return (s.outcome === "hit" || s.outcome === "crit") && !!t && !canSeeExactStats(t, scene.viewer);
  });

  const hitsAll = !!attacker && findFlags(withSelf(order, attacker), attacker.basicInfo.id, "attackHitsAllEnemies").length > 0;

  const chain = !!attacker && findFlags(withSelf(order, attacker), attacker.basicInfo.id, "chainShot").length > 0;

  const describe = (a: BattleAttack) => {
    const onMap = !!scene.battle.map && !!attacker?.battleData.position;

    const maxTargets = attacker ? attackMaxTargets(attacker, a, { chain, onMap }) : 1;

    return { attackId: a.id ?? a.name, maxTargets: hitsAll ? Math.max(maxTargets, enemyTargets.length) : maxTargets, diceSlots: attacker ? damageDiceSlots(attacker, a) : [6] };
  };

  const preselectAll = (chosen: BattleAttack) => {
    if (!hitsAll) return;

    const inReach = attacker && scene.battle.map && attacker.battleData.position ? enemiesInReach(scene.battle.map, order, attacker, chosen).filter(visible) : enemyTargets;

    dispatch({ type: "SET_TARGETS", ids: inReach.map((p) => p.basicInfo.id) });
  };

  const currentStrike = state.strikes[state.index];

  const currentMode = strikeMode(state, currentStrike);

  const attackCtx = { order, round: scene.battle.currentRound, map, rules: scene.battle.rules };

  const outcomeOf = (d20: number, second?: number): RollOutcome => {
    const target = byId(state.strikes[state.index]?.targetId ?? "");

    if (!attacker || !attack || !target) return "miss";

    return rollOutcomeOf(attacker, target, attack, attackCtx, { d20, second, mode: currentMode });
  };

  useAttackSubmit({ attacker, attack, flow: { state, dispatch }, onDone });

  const cunningOffer = useMemo(() => (attacker && !state.offHand && isOpen ? cunningStrikeOffer(attacker, scene.battle.currentRound) : null), [attacker, state.offHand, isOpen, scene.battle.currentRound]);

  const view = {
    cunning: cunningOffer && {
      options: cunningOffer.options.map((o) => ({ ...o, label: CUNNING_STRIKE_LABELS[o.effect], selected: !!state.cunningStrike?.includes(o.effect) })),
      maxEffects: cunningOffer.maxEffects,
      sneakDice: cunningOffer.sneakDice,
    },
    attack, attacks, targets, steps, estimate, cover, unknownDefense, previews,
    attackKind: attack ? (attackKindOf(attack.type) === AttackType.RANGED ? ("ranged" as const) : ("melee" as const)) : null,
    /** дальність перевірена картою — лише тоді «ціль поруч» правда */
    reachChecked: !!scene.battle.map && !!attacker?.battleData.position && state.targetIds.every((id) => !!byId(id)?.battleData.position),
    rollMode: currentMode,
    forcedMode: currentStrike?.forced,
    inspirationAvailable: canUseInspiration(attacker, scene.battle.rules),
    offHand: !!state.offHand,
    counter: attacker && !state.offHand ? attackCounter(attacker, order) : null,
    canSelectAllEnemies: enemyTargets.length > 1 && state.maxTargets >= enemyTargets.length,
  };

  const actions = {
    open: (targetId?: string, attackId?: string, opts: { offHand?: boolean } = {}) => {
      const offHand = !!opts.offHand;

      const pool = offHand ? attackPools.off : attackPools.main;

      const first = pool[0];

      if (!first) return;

      const target = targetId ? byId(targetId) : undefined;

      if (!target) {
        dispatch({ type: "OPEN", weaponCount: pool.length, ...describe(first), ...(offHand && { offHand }) });
        preselectAll(first);

        return;
      }

      const chosen = (attackId && pool.find((a) => (a.id ?? a.name) === attackId)) || first;

      const picked = pool.length === 1 || !!attackId;

      dispatch({ type: "OPEN", weaponCount: pool.length, ...describe(chosen), targetIds: [target.basicInfo.id], picked, ...(offHand && { offHand }) });

      if (picked) {
        if (pool.length > 1) dispatch({ type: "SELECT_WEAPON", ...describe(chosen) });

        const forced = attacker ? forcedFor(attacker, target, chosen, attackCtx) : undefined;

        dispatch({ type: "CONFIRM_TARGETS", forced: { [target.basicInfo.id]: forced } });
      }
    },
    changeWeapon: () => dispatch({ type: "CHANGE_WEAPON" }),
    selectWeapon: (a: BattleAttack) => {
      dispatch({ type: "SELECT_WEAPON", ...describe(a) });
      preselectAll(a);
    },
    toggleTarget: (id: string) => dispatch({ type: "TOGGLE_TARGET", id }),
    confirmTargets: () => {
      const forced = Object.fromEntries(
        state.targetIds.map((id) => {
          const t = byId(id);

          return [id, attacker && attack && t ? forcedFor(attacker, t, attack, attackCtx) : undefined];
        }),
      );

      dispatch({ type: "CONFIRM_TARGETS", forced });
    },
    selectAllEnemies: () => dispatch({ type: "SET_TARGETS", ids: enemyTargets.map((p) => p.basicInfo.id) }),
    toggleCunning: (effect: CunningStrikeEffect) => cunningOffer && dispatch({ type: "SET_CUNNING_STRIKE", effects: toggleCunningStrike(state.cunningStrike ?? [], effect, cunningOffer) }),
    setMode: (mode: AttackMode) => dispatch({ type: "SET_MODE", mode }),
    setInspiration: (value: boolean) => {
      const t = byId(state.strikes[0]?.targetId ?? "");

      const forced = attacker && attack && t ? forcedFor(attacker, t, attack, attackCtx, { inspiration: value }) : undefined;

      dispatch({ type: "SET_INSPIRATION", value, forced });
    },
    roll: (d20: number, second?: number) => dispatch({ type: "ROLL", d20, second, outcome: outcomeOf(d20, second) }),
    aiRoll: () => {
      const d20 = rollDie(20, cryptoRandom);

      const second = currentMode === "normal" ? undefined : rollDie(20, cryptoRandom);

      dispatch({ type: "ROLL", d20, second, outcome: outcomeOf(d20, second) });
    },
    damage: (values: number[]) => dispatch({ type: "DAMAGE", values }),
    back: () => dispatch({ type: "BACK" }),
    submit: () => dispatch({ type: "SUBMIT" }),
    close: () => dispatch({ type: "CLOSE" }),
  };

  const doubled = state.step === "damage" && currentStrike?.outcome === "crit" && critDoublesDice(scene.battle.rules, true);

  return { state: doubled ? { ...state, diceSlots: [...state.diceSlots, ...state.diceSlots] } : state, view, actions };
}
