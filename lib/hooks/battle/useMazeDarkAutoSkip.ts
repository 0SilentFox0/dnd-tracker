"use client";

import { useEffect } from "react";

import { useBattleScene } from "./useBattleScene";

import { BattleStatus } from "@/lib/constants/battle";
import { useNextTurn } from "@/lib/hooks/battles";

export const MAZE_DARK_SKIP_MS = 1500;

const silent = { onConflict: () => undefined };

/** У темряві хід нічого не дає: клієнт ДМ або власника поточного ходу сам його пропускає. */
export function useMazeDarkAutoSkip(): void {
  const { campaignId, battleId, battle, viewer, turn, anyPending } = useBattleScene();

  const nextTurn = useNextTurn(campaignId, battleId, silent);

  const { mutate } = nextTurn;

  const current = turn.current;

  const mine = viewer.isDM || (!!viewer.userId && current?.basicInfo.controlledBy === viewer.userId);

  const armed =
    battle.status === BattleStatus.ACTIVE && !!battle.map?.maze?.dark && !!current && mine && !battle.pendingMoraleCheck && !anyPending;

  const { version, currentTurnIndex } = battle;

  useEffect(() => {
    if (!armed) return;

    const timer = setTimeout(() => mutate({}), MAZE_DARK_SKIP_MS);

    return () => clearTimeout(timer);
  }, [armed, version, currentTurnIndex, mutate]);
}
