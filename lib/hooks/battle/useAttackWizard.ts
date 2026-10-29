"use client";

import { useEffect, useEffectEvent, useMemo, useReducer } from "react";

import { useModeView } from "./modes/useModeView";
import { useBattleScene } from "./useBattleScene";
import { useCritPause } from "./useCritPause";

import { AttackType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { isAirborne, isDying, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { CunningStrikeEffect } from "@/lib/utils/abilities/schema";
import { attackCounter } from "@/lib/utils/battle/attack/attacks-left";
import { predictAttack } from "@/lib/utils/battle/attack/bonus";
import { critDoublesDice } from "@/lib/utils/battle/attack/crit-dice";
import { critThresholdOf } from "@/lib/utils/battle/attack/crit-threshold";
import { CUNNING_STRIKE_LABELS, cunningStrikeOffer, toggleCunningStrike } from "@/lib/utils/battle/attack/cunning-strike";
import { canUseInspiration } from "@/lib/utils/battle/attack/inspiration";
import { attackMaxTargets } from "@/lib/utils/battle/attack/max-targets";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { resolveAttackRoll } from "@/lib/utils/battle/common/attack-roll-helpers";
import { computeDamageBreakdown } from "@/lib/utils/battle/damage";
import { damageDiceSlots } from "@/lib/utils/battle/damage/hero-damage";
import { obstacleStep } from "@/lib/utils/battle/damage/obstacle";
import { attackFlow, type AttackMode, type AttackOutcomeSummary, attackPayload, effectiveD20, forcedModeOf, initialAttackFlow, type RollOutcome, strikeMode } from "@/lib/utils/battle/flows";
import { enemiesInReach, lineOfFire } from "@/lib/utils/battle/grid";
import { isUp } from "@/lib/utils/battle/participant/state";
import { canSeeExactStats, critOutcome, formatKnownArmorClass, hiddenTargetSteps, resolveKnownArmorClass, retaliationOutcome, volleyResults, weaponPreview } from "@/lib/utils/battle/view";
import { cryptoRandom, rollDie } from "@/lib/utils/common/dice";
import { DEFAULT_RULES } from "@/lib/utils/rules";
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

  const { visible } = useModeView();

  const targets = order.filter(
    (p) => (isUp(p) || isDying(p)) && !isAirborne(p) && p !== attacker && visible(p) && (p.basicInfo.side !== attacker?.basicInfo.side || scene.battle.campaign?.friendlyFire === true),
  );

  const enemyTargets = targets.filter((p) => p.basicInfo.side !== attacker?.basicInfo.side);

  const byId = (id: string) => order.find((p) => p.basicInfo.id === id);

  const map = scene.battle.map;

  const cover = useMemo(() => {
    if (state.step === "closed" || !attacker || !attack || !map || attackKindOf(attack.type) !== AttackType.RANGED) return new Set<string>();

    const seen = order.filter((p) => p === attacker || visible(p));

    const candidates = seen.filter((p) => p !== attacker && (isUp(p) || isDying(p)));

    return new Set(candidates.filter((t) => lineOfFire(map, seen, attacker, t).blocked).map((t) => t.basicInfo.id));
  }, [state.step, attacker, attack, map, order, visible]);

  const steps = useMemo<DamageStep[][]>(() => {
    if (!attacker || !attack || state.step !== "summary") return [];

    return state.strikes
      .filter((s) => s.outcome === "hit" || s.outcome === "crit")
      .map((s) => {
        const target = byId(s.targetId);

        if (!target) return [];

        const full = computeDamageBreakdown({ attacker, target, attack, damageRolls: s.damage, allParticipants: order, isCritical: s.outcome === "crit", rules: scene.battle.rules }).steps;

        const shown = hiddenTargetSteps(full, s.targetId, scene.battle.battleLog ?? [], canSeeExactStats(target, scene.viewer), scene.battle.knowledge);

        return cover.has(s.targetId) ? [...shown, obstacleStep(shown.at(-1)?.after ?? 0)] : shown;
      });
    // byId читає order, який уже в deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attacker, attack, state.step, state.strikes, order, scene.battle.battleLog, scene.battle.knowledge, scene.viewer, cover]);

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

  const outcomeOf = (d20: number, second?: number): RollOutcome => {
    const target = byId(state.strikes[state.index]?.targetId ?? "");

    if (!attacker || !attack || !target) return "miss";

    const { totalBonus, targetAC } = predictAttack(attacker, target, attack, order, scene.battle.currentRound, map);

    const crit = scene.battle.rules?.criticals ?? DEFAULT_RULES.criticals;

    const r = resolveAttackRoll(
      { attackRoll: d20, ...(currentMode === "advantage" && second !== undefined && { advantageRoll: second }), ...(currentMode === "disadvantage" && second !== undefined && { disadvantageRoll: second }) },
      targetAC,
      totalBonus,
      { critOn: critThresholdOf(scene.battle.rules, order, attacker.basicInfo.id), fumbleOn: crit.fumbleOn },
    );

    return r.crit ? "crit" : r.critFail ? "critFail" : r.hit ? "hit" : "miss";
  };

  const finish = (attackerId: string, seen: Set<number>) => {
    const current = scene.readBattle();

    const log = current?.battleLog ?? [];

    const after = current?.initiativeOrder ?? order;

    const fromLog = volleyResults(log, seen, attackerId, after);

    const results: AttackOutcomeSummary[] = fromLog.length > 0 ? fromLog : state.strikes.map((s) => ({ kind: s.outcome === "crit" ? ("crit" as const) : s.outcome === "hit" ? ("hit" as const) : ("miss" as const), targetId: s.targetId, damage: 0, downed: false }));

    dispatch({ type: "SUCCESS", results });

    const first = results[0];

    const strike = state.strikes[0];

    const target = byId(first.targetId);

    const retaliation = retaliationOutcome(log, seen);

    const crit = critOutcome(log, seen, attackerId, first.targetId);

    const targetName = target?.basicInfo.name ?? "";

    const d20 = effectiveD20(strike, strikeMode(state, strike));

    const strikes = results.length > 1 ? results.map((r) => ({ targetName: byId(r.targetId)?.basicInfo.name ?? "", kind: r.kind, damage: r.damage, downed: r.downed, splash: r.splash })) : undefined;

    if (first.kind === "miss" || crit?.type === "fail") {
      const known = formatKnownArmorClass(resolveKnownArmorClass(log, first.targetId, current?.knowledge));

      scene.result.show({
        kind: "miss",
        targetName,
        d20,
        known,
        ...(strikes && { strikes }),
        ...(retaliation && { retaliation }),
        ...(crit?.type === "fail" && { critFail: crit }),
      });
    } else {
      scene.result.show({
        kind: first.kind,
        targetName,
        damage: results.reduce((s, r) => s + r.damage, 0),
        downed: first.downed,
        d20,
        weapon: attack?.name,
        ...(strikes && { strikes }),
        ...(retaliation && { retaliation }),
        ...(crit?.type === "success" && { critEffect: crit }),
      });
    }

    onDone?.();
  };

  const settle = (attackerId: string, seen: Set<number>) => {
    try {
      finish(attackerId, seen);
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof Error ? e.message : textRef("battleWizards.attack.failed") });
    }
  };

  const pauseCrit = useCritPause({
    waiting: state.waitingCrit,
    actorId: attacker?.basicInfo.id,
    onResolved: (seen) => attacker && settle(attacker.basicInfo.id, seen),
    onCancelled: () => dispatch({ type: "FAIL", error: textRef("battleWizards.critCancelled") }),
  });

  const send = useEffectEvent(async () => {
    if (!attacker) return;

    const seen = new Set((scene.battle.battleLog ?? []).map((e) => e.actionIndex));

    let res: Awaited<ReturnType<typeof scene.actions.attack.mutateAsync>>;

    try {
      res = await scene.actions.attack.mutateAsync(attackPayload(state, attacker.basicInfo.id));
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof Error ? e.message : textRef("battleWizards.attack.failed") });

      return;
    }

    if (res?.pendingCritChoice) {
      pauseCrit(seen);
      dispatch({ type: "WAIT_CRIT" });

      return;
    }

    settle(attacker.basicInfo.id, seen);
  });

  useEffect(() => {
    if (state.step === "submitting") void send();
  }, [state.step]);

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

        const forced = attacker ? forcedModeOf(predictAttack(attacker, target, chosen, order, scene.battle.currentRound, map)) : undefined;

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

          return [id, attacker && attack && t ? forcedModeOf(predictAttack(attacker, t, attack, order, scene.battle.currentRound, map)) : undefined];
        }),
      );

      dispatch({ type: "CONFIRM_TARGETS", forced });
    },
    selectAllEnemies: () => dispatch({ type: "SET_TARGETS", ids: enemyTargets.map((p) => p.basicInfo.id) }),
    toggleCunning: (effect: CunningStrikeEffect) => cunningOffer && dispatch({ type: "SET_CUNNING_STRIKE", effects: toggleCunningStrike(state.cunningStrike ?? [], effect, cunningOffer) }),
    setMode: (mode: AttackMode) => dispatch({ type: "SET_MODE", mode }),
    setInspiration: (value: boolean) => {
      const t = byId(state.strikes[0]?.targetId ?? "");

      const forced = attacker && attack && t ? forcedModeOf(predictAttack(attacker, t, attack, order, scene.battle.currentRound, map, { inspiration: value })) : undefined;

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
