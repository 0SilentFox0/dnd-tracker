"use client";

import { useEffect, useReducer, useRef } from "react";

import { afterMoraleDice } from "./morale-dice";
import { useBattleScene } from "./useBattleScene";
import { useFxEnabled } from "./useFxEnabled";

import { BattleStatus } from "@/lib/constants/battle";
import { useConfirm, usePageHidden } from "@/lib/hooks/common";
import { initialTurnFlow, MORALE_SKIP_MS, moraleOutcome, turnFlow } from "@/lib/utils/battle/flows";
import { checkReturnToStart } from "@/lib/utils/battle/grid";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import type { PendingMoraleCheckPayload } from "@/lib/utils/battle/turn";
import { canCastBonusSpell, needsMoraleCheck, turnExhausted } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

type BonusSpell = Parameters<typeof canCastBonusSpell>[1][number];

export function usePlayerTurn(participant: BattleParticipant, bonusSpells: BonusSpell[] = []) {
  const scene = useBattleScene();

  const confirm = useConfirm();

  const fx = useFxEnabled();

  const hidden = usePageHidden();

  const fxActive = fx.enabled && !hidden;

  const [state, dispatch] = useReducer(turnFlow, initialTurnFlow, (s) =>
    turnFlow(s, { type: "BEGIN", needsMorale: needsMoraleCheck(participant, scene.battle.initiativeOrder, scene.battle.pendingMoraleCheck) }),
  );

  const id = participant.basicInfo.id;

  const pending = scene.battle.pendingMoraleCheck as PendingMoraleCheckPayload | null;

  const moraleResult = state.moraleResult ?? (pending?.participantId === id ? moraleOutcome(pending.moraleResult) : undefined);

  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lifetime = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    lifetime.current = controller;

    return () => {
      if (skipTimer.current) clearTimeout(skipTimer.current);

      controller.abort();
    };
  }, []);

  const { map, initiativeOrder } = scene.battle;

  const canReturn = !!map && !participant.battleData.reserved && checkReturnToStart(map, initiativeOrder, participant).ok;

  const canReturnNow = () => {
    const latest = scene.readBattle();

    const me = latest?.initiativeOrder.find((p) => p.basicInfo.id === id);

    return !!latest?.map && !!me && !me.battleData.reserved && checkReturnToStart(latest.map, latest.initiativeOrder, me).ok;
  };

  const fresh = () => scene.readBattle()?.initiativeOrder.find((p) => p.basicInfo.id === id) ?? participant;

  const { mutate: move } = scene.actions.move;

  const returnToStart = () => {
    const to = participant.battleData.turnStartPosition;

    if (to) move({ participantId: id, to, returnToStart: true });
  };

  const endTurn = async () => {
    if (!participant.actionFlags.hasUsedAction && moraleResult !== "skip") {
      const ok = await confirm({ title: "Завершити хід?", description: "Дію ще не використано.", confirmLabel: "Завершити", signal: lifetime.current?.signal });

      if (!ok) return;
    }

    try {
      await scene.actions.nextTurn.mutateAsync({});
    } catch {
      return;
    }

    dispatch({ type: "END" });
  };

  const actions = {
    afterAction: () => {
      if (scene.readBattle()?.status !== BattleStatus.ACTIVE) return;

      if (turnExhausted(fresh(), bonusSpells, { canReturn: canReturnNow(), coreActions: !!scene.battle.rules?.actions.enabled })) dispatch({ type: "EXHAUSTED" });
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

      if (fxActive && result !== "none") {
        const signal = lifetime.current?.signal;

        await afterMoraleDice(signal);

        if (signal?.aborted) return;
      }

      if (result === "extra") scene.result.show({ kind: "morale-extra", ...base });
      else if (result === "skip") {
        scene.result.show({ kind: "morale-skip", ...base });

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

  const wasReturnable = useRef(canReturn);

  useEffect(() => {
    const was = wasReturnable.current;

    wasReturnable.current = canReturn;

    if (was && !canReturn) actions.afterAction();
  });

  const strikeAndReturn = { available: canReturn, run: returnToStart };

  return {
    phase: state.phase,
    moraleResult,
    status: {
      actionUsed: participant.actionFlags.hasUsedAction,
      bonusAvailable: !participant.actionFlags.hasUsedBonusAction,
      bonusSpellReady: canCastBonusSpell(participant, bonusSpells),
      skipped: moraleResult === "skip",
    },
    actions,
    strikeAndReturn,
  };
}
