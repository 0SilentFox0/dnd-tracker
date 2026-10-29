"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import { useBattleScene } from "./useBattleScene";

interface CritPauseOptions {
  waiting: boolean | undefined;
  actorId: string | undefined;
  onResolved(seen: Set<number>): void;
  onCancelled(): void;
}

/** Дія стала на паузу, поки ДМ обирає ефект крита: після зняття pending або завершує її за новими записами журналу, або повідомляє про скасування. */
export function useCritPause({ waiting, actorId, onResolved, onCancelled }: CritPauseOptions) {
  const scene = useBattleScene();

  const seenRef = useRef(new Set<number>());

  const critPending = !!scene.battle.pendingCritChoice;

  const resolved = useEffectEvent(onResolved);

  const cancelled = useEffectEvent(onCancelled);

  const settle = useEffectEvent(() => {
    const log = scene.readBattle()?.battleLog ?? [];

    if (log.some((e) => !seenRef.current.has(e.actionIndex) && e.actorId === actorId)) resolved(seenRef.current);
    else cancelled();
  });

  useEffect(() => {
    if (waiting && !critPending) settle();
  }, [waiting, critPending]);

  return (seen: Set<number>) => {
    seenRef.current = seen;
  };
}
