"use client";

import { useEffect, useReducer, useRef } from "react";

import { useBattleScene } from "./useBattleScene";

import { BattleStatus } from "@/lib/constants/battle";
import { useConfirm } from "@/lib/hooks/common";
import { initialTurnFlow, MORALE_SKIP_MS, moraleOutcome, turnFlow } from "@/lib/utils/battle/flows";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import type { PendingMoraleCheckPayload } from "@/lib/utils/battle/turn";
import { needsMoraleCheck } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const exhausted = (p: BattleParticipant) => {
  const bonusLeft = (p.battleData.resolvedAbilities ?? []).some((a) => a.trigger.event === "bonusAction") && !p.actionFlags.hasUsedBonusAction;

  return p.actionFlags.hasUsedAction && !bonusLeft;
};

export function usePlayerTurn(participant: BattleParticipant) {
  const scene = useBattleScene();

  const confirm = useConfirm();

  const [state, dispatch] = useReducer(turnFlow, initialTurnFlow, (s) =>
    turnFlow(s, { type: "BEGIN", needsMorale: needsMoraleCheck(participant, scene.battle.initiativeOrder, scene.battle.pendingMoraleCheck) }),
  );

  const id = participant.basicInfo.id;

  const pending = scene.battle.pendingMoraleCheck as PendingMoraleCheckPayload | null;

  const moraleResult = state.moraleResult ?? (pending?.participantId === id ? moraleOutcome(pending.moraleResult) : undefined);

  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (skipTimer.current) clearTimeout(skipTimer.current);
    },
    [],
  );

  const fresh = () => scene.readBattle()?.initiativeOrder.find((p) => p.basicInfo.id === id) ?? participant;

  const endTurn = async () => {
    if (!participant.actionFlags.hasUsedAction && moraleResult !== "skip") {
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
    skipped: moraleResult === "skip",
    moraleResult,
    afterAction: () => {
      if (scene.readBattle()?.status !== BattleStatus.ACTIVE) return;

      if (exhausted(fresh())) dispatch({ type: "EXHAUSTED" });
    },
    rollMorale: async (d10: number) => {
      let res;

      try {
        res = await scene.actions.moraleCheck.mutateAsync({ participantId: id, d10Roll: d10 });
      } catch {
        return;
      }

      const result = moraleOutcome(res?.moraleResult);

      dispatch({ type: "MORALE_RESULT", result });

      const base = { name: participant.basicInfo.name, d10, morale: effectiveMorale(participant, scene.readBattle()?.initiativeOrder ?? []).value };

      if (result === "extra") scene.showResult({ kind: "morale-extra", ...base });
      else if (result === "skip") {
        scene.showResult({ kind: "morale-skip", ...base });

        // версія фіксується одразу: якщо DM встигне передати хід сам, таймер отримає 409, а не пропустить наступного
        const expectedVersion = scene.readBattle()?.version;

        skipTimer.current = setTimeout(
          () => scene.actions.nextTurn.mutate({ expectedVersion }, { onError: () => dispatch({ type: "RECOVER" }) }),
          MORALE_SKIP_MS,
        );
      }
      else scene.toast.show(`${participant.basicInfo.name} · мораль: без змін (d10 = ${d10})`);
    },
    stay: () => dispatch({ type: "STAY" }),
    endTurn,
  };
}
