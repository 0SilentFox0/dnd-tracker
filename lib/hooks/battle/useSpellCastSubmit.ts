"use client";

import { type Dispatch, useEffect, useEffectEvent } from "react";

import { useBattleScene } from "./useBattleScene";
import { CRIT_CANCELLED, useCritPause } from "./useCritPause";

import { type SpellFlowAction, type SpellFlowState, spellPayload } from "@/lib/utils/battle/flows";
import { buildSpellResultFx } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

type HpChanges = Parameters<typeof buildSpellResultFx>[1];

interface SpellCastSubmitInput {
  caster: BattleParticipant | null;
  selected: BookSpell | null;
  flow: { state: SpellFlowState; dispatch: Dispatch<SpellFlowAction> };
  cast: { free: boolean; legendaryKey?: string; finishLong: boolean };
  onDone?: () => void;
}

/** Надсилає каст, чекає на вибір крита від ДМ і показує підсумок. */
export function useSpellCastSubmit({ caster, selected, flow: { state, dispatch }, cast, onDone }: SpellCastSubmitInput) {
  const scene = useBattleScene();

  const finish = (changes: HpChanges) => {
    dispatch({ type: "SUCCESS" });
    scene.result.show(buildSpellResultFx(selected?.name, changes, state.targetIds.length));
    onDone?.();
  };

  const pauseCrit = useCritPause({
    waiting: state.waitingCrit,
    actorId: caster?.basicInfo.id,
    onResolved: (seen) => {
      const log = scene.readBattle()?.battleLog ?? [];

      finish(log.filter((e) => !seen.has(e.actionIndex) && e.actorId === caster?.basicInfo.id).flatMap((e) => e.hpChanges ?? []));
    },
    onCancelled: () => dispatch({ type: "FAIL", error: CRIT_CANCELLED }),
  });

  const send = useEffectEvent(async () => {
    if (!caster) return;

    const seen = new Set((scene.battle.battleLog ?? []).map((e) => e.actionIndex));

    try {
      const res = await scene.actions.castSpell.mutateAsync({
        ...spellPayload(state),
        ...(cast.free && { free: true }),
        ...(cast.legendaryKey !== undefined && { legendaryKey: cast.legendaryKey }),
        ...(cast.finishLong && caster.battleData.pendingCast && { castingRounds: caster.battleData.pendingCast.remainingRounds }),
      });

      if (res?.pendingCritChoice) {
        pauseCrit(seen);
        dispatch({ type: "WAIT_CRIT" });

        return;
      }

      finish(res?.hpChanges ?? []);
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof Error ? e.message : "Не вдалося застосувати заклинання" });
    }
  });

  useEffect(() => {
    if (state.step === "submitting") void send();
  }, [state.step]);
}
