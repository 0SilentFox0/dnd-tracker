"use client";

import { useEffect, useReducer, useRef } from "react";

import { useBattleScene } from "./useBattleScene";

import { useConfirm } from "@/lib/hooks/common";
import { initialTurnFlow, turnFlow } from "@/lib/utils/battle/flows";
import { needsMoraleCheck } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const MORALE_SKIP_MS = 4_000;

const exhausted = (p: BattleParticipant) => {
  const bonusLeft = (p.battleData.resolvedAbilities ?? []).some((a) => a.trigger.event === "bonusAction") && !p.actionFlags.hasUsedBonusAction;

  return p.actionFlags.hasUsedAction && !bonusLeft;
};

export function usePlayerTurn(participant: BattleParticipant) {
  const scene = useBattleScene();

  const confirm = useConfirm();

  const [state, dispatch] = useReducer(turnFlow, initialTurnFlow, (s) =>
    turnFlow(s, { type: "BEGIN", needsMorale: needsMoraleCheck(participant, scene.battle.pendingMoraleCheck) }),
  );

  const id = participant.basicInfo.id;

  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (skipTimer.current) clearTimeout(skipTimer.current);
    },
    [],
  );

  const fresh = () => scene.readBattle()?.initiativeOrder.find((p) => p.basicInfo.id === id) ?? participant;

  const endTurn = async () => {
    if (!participant.actionFlags.hasUsedAction) {
      const ok = await confirm({ title: "Завершити хід?", description: "Дію ще не використано.", confirmLabel: "Завершити" });

      if (!ok) return;
    }

    try {
      await scene.actions.nextTurn.mutateAsync({});
    } catch {
      return;
    }

    dispatch({ type: "END" });
  };

  return {
    phase: state.phase,
    actionUsed: participant.actionFlags.hasUsedAction,
    bonusAvailable: !participant.actionFlags.hasUsedBonusAction,
    afterAction: () => {
      if (exhausted(fresh())) dispatch({ type: "EXHAUSTED" });
    },
    rollMorale: async (d10: number) => {
      let res;

      try {
        res = await scene.actions.moraleCheck.mutateAsync({ participantId: id, d10Roll: d10 });
      } catch {
        return;
      }

      const r = res?.moraleResult;

      const result = r?.hasExtraTurn ? "extra" : r?.shouldSkipTurn ? "skip" : "none";

      dispatch({ type: "MORALE_RESULT", result });

      const base = { name: participant.basicInfo.name, d10, morale: participant.combatStats.morale };

      if (result === "extra") scene.showResult({ kind: "morale-extra", ...base });
      else if (result === "skip") {
        scene.showResult({ kind: "morale-skip", ...base });

        // версія фіксується одразу: якщо DM встигне передати хід сам, таймер отримає 409, а не пропустить наступного
        const expectedVersion = scene.readBattle()?.version;

        skipTimer.current = setTimeout(() => scene.actions.nextTurn.mutate({ expectedVersion }), MORALE_SKIP_MS);
      }
      else scene.toast.show(`${participant.basicInfo.name} · мораль: без змін (d10 = ${d10})`);
    },
    stay: () => dispatch({ type: "STAY" }),
    endTurn,
  };
}
