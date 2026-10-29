"use client";

import { type Dispatch, useEffect, useEffectEvent } from "react";

import { useBattleScene } from "./useBattleScene";
import { CRIT_CANCELLED, useCritPause } from "./useCritPause";

import { type AttackFlowAction, type AttackFlowState, attackPayload, effectiveD20, strikeMode } from "@/lib/utils/battle/flows";
import { attackResultsOf, buildAttackResultFx } from "@/lib/utils/battle/view";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const FAIL_TEXT = "Не вдалося виконати атаку";

interface AttackSubmitInput {
  attacker: BattleParticipant | null;
  attack: BattleAttack | null;
  flow: { state: AttackFlowState; dispatch: Dispatch<AttackFlowAction> };
  onDone?: () => void;
}

/** Надсилає атаку, чекає на вибір крита від ДМ і показує підсумок. */
export function useAttackSubmit({ attacker, attack, flow: { state, dispatch }, onDone }: AttackSubmitInput) {
  const scene = useBattleScene();

  const order = scene.battle.initiativeOrder;

  const finish = (attackerId: string, seen: Set<number>) => {
    const current = scene.readBattle();

    const log = current?.battleLog ?? [];

    const results = attackResultsOf(log, seen, attackerId, current?.initiativeOrder ?? order, state.strikes);

    dispatch({ type: "SUCCESS", results });

    const strike = state.strikes[0];

    scene.result.show(
      buildAttackResultFx({
        results,
        log,
        seen,
        attackerId,
        d20: effectiveD20(strike, strikeMode(state, strike)),
        weapon: attack?.name,
        nameOf: (id) => order.find((p) => p.basicInfo.id === id)?.basicInfo.name ?? "",
        knowledge: current?.knowledge,
      }),
    );

    onDone?.();
  };

  const settle = (attackerId: string, seen: Set<number>) => {
    try {
      finish(attackerId, seen);
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof Error ? e.message : FAIL_TEXT });
    }
  };

  const pauseCrit = useCritPause({
    waiting: state.waitingCrit,
    actorId: attacker?.basicInfo.id,
    onResolved: (seen) => attacker && settle(attacker.basicInfo.id, seen),
    onCancelled: () => dispatch({ type: "FAIL", error: CRIT_CANCELLED }),
  });

  const send = useEffectEvent(async () => {
    if (!attacker) return;

    const seen = new Set((scene.battle.battleLog ?? []).map((e) => e.actionIndex));

    let res: Awaited<ReturnType<typeof scene.actions.attack.mutateAsync>>;

    try {
      res = await scene.actions.attack.mutateAsync(attackPayload(state, attacker.basicInfo.id));
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof Error ? e.message : FAIL_TEXT });

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
}
