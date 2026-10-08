"use client";

import { useEffect, useEffectEvent, useMemo, useReducer } from "react";

import { useBattleScene } from "./useBattleScene";

import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import { predictAttackNumbers, predictRollMode } from "@/lib/utils/battle/attack/bonus";
import { resolveAttackRoll } from "@/lib/utils/battle/common/attack-roll-helpers";
import { computeDamageBreakdown } from "@/lib/utils/battle/damage";
import { attackFlow, type AttackMode, attackPayload, effectiveD20, initialAttackFlow, type RollOutcome } from "@/lib/utils/battle/flows";
import { isUp } from "@/lib/utils/battle/participant/state";
import { canSeeExactStats, critOutcome, damageDiceSlots, formatKnownArmorClass, hiddenTargetSteps, resolveKnownArmorClass, retaliationOutcome, weaponPreview } from "@/lib/utils/battle/view";
import type { BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

export function rollDie(sides: number): number {
  const buf = new Uint32Array(1);

  crypto.getRandomValues(buf);

  return (buf[0] % sides) + 1;
}

export function useAttackWizard(attacker: BattleParticipant | null, onDone?: () => void) {
  const scene = useBattleScene();

  const [state, dispatch] = useReducer(attackFlow, initialAttackFlow);

  const order = scene.battle.initiativeOrder;

  const attacks = useMemo(() => attacker?.battleData.attacks ?? [], [attacker]);

  const attack = attacks.find((a) => (a.id ?? a.name) === state.attackId) ?? null;

  const targets = order.filter(
    (p) => isUp(p) && p !== attacker && (p.basicInfo.side !== attacker?.basicInfo.side || scene.battle.campaign?.friendlyFire === true),
  );

  const enemyTargets = targets.filter((p) => p.basicInfo.side !== attacker?.basicInfo.side);

  const byId = (id: string) => order.find((p) => p.basicInfo.id === id);

  const steps = useMemo<DamageStep[][]>(() => {
    if (!attacker || !attack || state.step !== "summary") return [];

    return state.strikes
      .filter((s) => s.outcome === "hit" || s.outcome === "crit")
      .map((s) => {
        const target = byId(s.targetId);

        if (!target) return [];

        const full = computeDamageBreakdown({ attacker, target, attack, damageRolls: s.damage, allParticipants: order, isCritical: s.outcome === "crit" }).steps;

        return hiddenTargetSteps(full, s.targetId, scene.battle.battleLog ?? [], canSeeExactStats(target, scene.viewer), scene.battle.knowledge);
      });
    // byId читає order, який уже в deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attacker, attack, state.step, state.strikes, order, scene.battle.battleLog, scene.battle.knowledge, scene.viewer]);

  const estimate = steps.reduce((sum, list) => sum + (list.at(-1)?.after ?? 0), 0);

  const previews = useMemo(
    () => (attacker ? Object.fromEntries(attacks.map((a) => [a.id ?? a.name, weaponPreview(attacker, a, order)])) : {}),
    [attacker, attacks, order],
  );

  const unknownDefense = state.strikes.some((s) => {
    const t = byId(s.targetId);

    return (s.outcome === "hit" || s.outcome === "crit") && !!t && !canSeeExactStats(t, scene.viewer);
  });

  const hitsAll = !!attacker && findFlags(withSelf(order, attacker), attacker.basicInfo.id, "attackHitsAllEnemies").length > 0;

  const hasFalloff = !!attacker && findFlags(withSelf(order, attacker), attacker.basicInfo.id, "multiTargetFalloff").length > 0;

  const describe = (a: BattleAttack) => {
    const maxTargets = Math.max(1, a.maxTargets ?? attacker?.combatStats.maxTargets ?? 1);

    return { attackId: a.id ?? a.name, maxTargets: hitsAll ? Math.max(maxTargets, enemyTargets.length) : maxTargets, diceSlots: attacker ? damageDiceSlots(attacker, a) : [6] };
  };

  const preselectAll = () => {
    if (hitsAll) dispatch({ type: "SET_TARGETS", ids: enemyTargets.map((p) => p.basicInfo.id) });
  };

  const outcomeOf = (d20: number, second?: number): RollOutcome => {
    const target = byId(state.strikes[state.index]?.targetId ?? "");

    if (!attacker || !attack || !target) return "miss";

    const { totalBonus, targetAC } = predictAttackNumbers(attacker, target, attack, order);

    const r = resolveAttackRoll(
      { attackRoll: d20, ...(state.mode === "advantage" && second !== undefined && { advantageRoll: second }), ...(state.mode === "disadvantage" && second !== undefined && { disadvantageRoll: second }) },
      targetAC,
      totalBonus,
    );

    return r.crit ? "crit" : r.critFail ? "critFail" : r.hit ? "hit" : "miss";
  };

  const send = useEffectEvent(async () => {
    if (!attacker) return;

    const seen = new Set((scene.battle.battleLog ?? []).map((e) => e.actionIndex));

    try {
      const res = await scene.actions.attack.mutateAsync(attackPayload(state, attacker.basicInfo.id, { allStrikes: hitsAll || hasFalloff }));

      const hpChanges = res?.hpChanges ?? [];

      const current = scene.readBattle();

      const log = current?.battleLog ?? [];

      const after = current?.initiativeOrder ?? order;

      const results = state.strikes.map((s) => {
        const now = after.find((p) => p.basicInfo.id === s.targetId);

        const hit = s.outcome === "hit" || s.outcome === "crit";

        return {
          kind: (s.outcome === "crit" ? "crit" : hit ? "hit" : "miss") as "crit" | "hit" | "miss",
          targetId: s.targetId,
          damage: hpChanges.filter((h) => h.participantId === s.targetId).reduce((sum, h) => sum + Math.max(0, h.change), 0),
          downed: !!now && !isUp(now),
        };
      });

      dispatch({ type: "SUCCESS", results });

      const first = results[0];

      const strike = state.strikes[0];

      const target = byId(first.targetId);

      const retaliation = retaliationOutcome(log, seen);

      const crit = critOutcome(log, seen, attacker.basicInfo.id, first.targetId);

      const targetName = target?.basicInfo.name ?? "";

      const d20 = effectiveD20(strike, state.mode);

      if (first.kind === "miss" || crit?.type === "fail") {
        const known = formatKnownArmorClass(resolveKnownArmorClass(log, first.targetId, current?.knowledge));

        scene.showResult({
          kind: "miss",
          targetName,
          d20,
          known,
          ...(retaliation && { retaliation }),
          ...(crit?.type === "fail" && { critFail: crit }),
        });
      } else {
        scene.showResult({
          kind: first.kind,
          targetName,
          damage: results.reduce((s, r) => s + r.damage, 0),
          downed: first.downed,
          d20,
          weapon: attack?.name,
          ...(retaliation && { retaliation }),
          ...(crit?.type === "success" && { critEffect: crit }),
        });
      }

      onDone?.();
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof Error ? e.message : "Не вдалося виконати атаку" });
    }
  });

  useEffect(() => {
    if (state.step === "submitting") void send();
  }, [state.step]);

  return {
    state, attack, attacks, targets, steps, estimate, unknownDefense, previews,
    open: () => {
      const first = attacks[0];

      if (!first) return;

      dispatch({ type: "OPEN", weaponCount: attacks.length, ...describe(first) });
      preselectAll();
    },
    selectWeapon: (a: BattleAttack) => {
      dispatch({ type: "SELECT_WEAPON", ...describe(a) });
      preselectAll();
    },
    toggleTarget: (id: string) => dispatch({ type: "TOGGLE_TARGET", id }),
    confirmTargets: () => {
      const first = byId(state.targetIds[0]);

      if (attacker && attack && first) dispatch({ type: "SET_MODE", mode: predictRollMode(attacker, first, attack, order) });

      dispatch({ type: "CONFIRM_TARGETS" });
    },
    canSelectAllEnemies: enemyTargets.length > 1 && state.maxTargets >= enemyTargets.length,
    selectAllEnemies: () => dispatch({ type: "SET_TARGETS", ids: enemyTargets.map((p) => p.basicInfo.id) }),
    setMode: (mode: AttackMode) => dispatch({ type: "SET_MODE", mode }),
    roll: (d20: number, second?: number) => dispatch({ type: "ROLL", d20, second, outcome: outcomeOf(d20, second) }),
    aiRoll: () => {
      const d20 = rollDie(20);

      const second = state.mode === "normal" ? undefined : rollDie(20);

      dispatch({ type: "ROLL", d20, second, outcome: outcomeOf(d20, second) });
    },
    damage: (values: number[]) => dispatch({ type: "DAMAGE", values }),
    back: () => dispatch({ type: "BACK" }),
    submit: () => dispatch({ type: "SUBMIT" }),
    close: () => dispatch({ type: "CLOSE" }),
  };
}
