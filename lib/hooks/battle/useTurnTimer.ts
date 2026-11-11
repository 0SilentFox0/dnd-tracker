"use client";

import { useEffect, useState } from "react";

import { useBattleScene } from "./useBattleScene";

import { BattleStatus } from "@/lib/constants/battle";
import { useNextTurn } from "@/lib/hooks/battles";

const TICK_MS = 500;

const silent = { onConflict: () => undefined };

/** Залишок часу ходу (лише відображення, без побічних ефектів). */
export function useTurnCountdown(): { secondsLeft: number | null; totalSeconds: number | null } {
  const { battle, turn } = useBattleScene();

  const { turnStartedAt, turnTimerSeconds: seconds, status } = battle;

  const running = !!seconds && status === BattleStatus.ACTIVE && !!turnStartedAt && !!turn.current;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;

    const id = setInterval(() => setNow(Date.now()), TICK_MS);

    return () => clearInterval(id);
  }, [running]);

  const secondsLeft = running ? Math.max(0, Math.ceil((seconds * 1000 - (now - new Date(turnStartedAt).getTime())) / 1000)) : null;

  return { secondsLeft, totalSeconds: running ? seconds : null };
}

/** Таймер ходу бою: а коли час вийшов — клієнт ДМа або власника ходу завершує хід. */
export function useTurnTimer(): { secondsLeft: number | null } {
  const { campaignId, battleId, battle, viewer, turn, anyPending } = useBattleScene();

  const { mutate } = useNextTurn(campaignId, battleId, silent);

  const { secondsLeft } = useTurnCountdown();

  const mine = viewer.isDM || (!!viewer.userId && turn.current?.basicInfo.controlledBy === viewer.userId);

  const paused = !!battle.pendingCritChoice || anyPending;

  const expired = secondsLeft === 0 && mine && !paused;

  useEffect(() => {
    if (expired) mutate({ auto: true });
  }, [expired, battle.version, mutate]);

  return { secondsLeft };
}
