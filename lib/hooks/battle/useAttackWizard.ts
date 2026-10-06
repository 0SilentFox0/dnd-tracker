"use client";

import { useEffect, useEffectEvent, useMemo, useReducer } from "react";

import { useBattleScene } from "./useBattleScene";

import { predictAttackNumbers } from "@/lib/utils/battle/attack";
import { resolveAttackRoll } from "@/lib/utils/battle/common/attack-roll-helpers";
import { computeDamageBreakdown } from "@/lib/utils/battle/damage";
import { attackFlow, type AttackMode, attackPayload, effectiveD20, initialAttackFlow, type RollOutcome } from "@/lib/utils/battle/flows";
import { canSeeExactStats, damageDiceSlots, formatKnownArmorClass, hiddenTargetSteps, knownArmorClass, retaliationOutcome, weaponPreview } from "@/lib/utils/battle/view";
import type { BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

export function rollDie(sides: number): number {
  const buf = new Uint32Array(1);

  crypto.getRandomValues(buf);

  return (buf[0] % sides) + 1;
}

const isUp = (p: BattleParticipant) => p.combatStats.status === "active" && p.combatStats.currentHp > 0;

export function useAttackWizard(attacker: BattleParticipant | null, onDone?: () => void) {
  const scene = useBattleScene();

  const [state, dispatch] = useReducer(attackFlow, initialAttackFlow);

  const order = scene.battle.initiativeOrder;

  const attacks = useMemo(() => attacker?.battleData.attacks ?? [], [attacker]);

  const attack = attacks.find((a) => (a.id ?? a.name) === state.attackId) ?? null;

  const targets = order.filter(
    (p) => isUp(p) && p !== attacker && (p.basicInfo.side !== attacker?.basicInfo.side || scene.battle.campaign?.friendlyFire === true),
  );

  const byId = (id: string) => order.find((p) => p.basicInfo.id === id);

  const steps = useMemo<DamageStep[][]>(() => {
    if (!attacker || !attack || state.step !== "summary") return [];

    return state.strikes
      .filter((s) => s.outcome === "hit" || s.outcome === "crit")
      .map((s) => {
        const target = byId(s.targetId);

        if (!target) return [];

        const full = computeDamageBreakdown({ attacker, target, attack, damageRolls: s.damage, allParticipants: order, isCritical: s.outcome === "crit" }).steps;

        return hiddenTargetSteps(full, s.targetId, scene.battle.battleLog ?? [], canSeeExactStats(target, scene.viewer));
      });
    // byId читає order, який уже в deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attacker, attack, state.step, state.strikes, order, scene.battle.battleLog, scene.viewer]);

  const estimate = steps.reduce((sum, list) => sum + (list.at(-1)?.after ?? 0), 0);

  const previews = useMemo(
    () => (attacker ? Object.fromEntries(attacks.map((a) => [a.id ?? a.name, weaponPreview(attacker, a, order)])) : {}),
    [attacker, attacks, order],
  );

  const unknownDefense = state.strikes.some((s) => {
    const t = byId(s.targetId);

    return (s.outcome === "hit" || s.outcome === "crit") && !!t && !canSeeExactStats(t, scene.viewer);
  });

  const describe = (a: BattleAttack) => ({ attackId: a.id ?? a.name, maxTargets: Math.max(1, a.maxTargets ?? attacker?.combatStats.maxTargets ?? 1), diceSlots: attacker ? damageDiceSlots(attacker, a) : [6] });

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
      const res = await scene.actions.attack.mutateAsync(attackPayload(state, attacker.basicInfo.id));

      const hpChanges = res?.hpChanges ?? [];

      const after = scene.readBattle()?.initiativeOrder ?? order;

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

      const retaliation = retaliationOutcome(scene.readBattle()?.battleLog ?? [], seen);

      if (first.kind === "miss") {
        const log = scene.readBattle()?.battleLog ?? [];

        scene.showResult({ kind: "miss", targetName: target?.basicInfo.name ?? "", d20: effectiveD20(strike, state.mode), known: formatKnownArmorClass(knownArmorClass(log, first.targetId)), ...(retaliation && { retaliation }) });
      } else {
        scene.showResult({ kind: first.kind, targetName: target?.basicInfo.name ?? "", damage: results.reduce((s, r) => s + r.damage, 0), downed: first.downed, d20: effectiveD20(strike, state.mode), weapon: attack?.name, ...(retaliation && { retaliation }) });
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

      if (first) dispatch({ type: "OPEN", weaponCount: attacks.length, ...describe(first) });
    },
    selectWeapon: (a: BattleAttack) => dispatch({ type: "SELECT_WEAPON", ...describe(a) }),
    toggleTarget: (id: string) => dispatch({ type: "TOGGLE_TARGET", id }),
    confirmTargets: () => dispatch({ type: "CONFIRM_TARGETS" }),
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
