"use client";

import { useEffect, useEffectEvent } from "react";

import { AUDIO_DRIFT_CHECK_MS } from "@/lib/constants/music";
import { audioPosition, planSync } from "@/lib/utils/audio/position";
import type { BattleAudioState } from "@/types/audio";

/** Тонкий адаптер плеєра (<audio> чи YouTube) для спільної синхронізації з сервером. */
export interface MediaHandle {
  /** false — у плеєрі ще не той трек */
  ready(): boolean;
  currentTime(): number;
  paused(): boolean;
  /** null — плеєр ще не знає тривалості */
  duration(): number | null;
  play(): Promise<void> | void;
  pause(): void;
  seek(sec: number): void;
}

/**
 * Застосовує план audioPosition/planSync при зміні стану чи resyncKey і перевіряє дрейф кожні
 * AUDIO_DRIFT_CHECK_MS. resyncKey — подія драйвера, після якої варто звіритися одразу (src, метадані, старт YouTube).
 */
export interface DriftSyncInput {
  state: BattleAudioState | null;
  clockOffsetMs: number;
  /** false — грати не можна (звук не увімкнено чи нема src) */
  canPlay: boolean;
  resyncKey?: unknown;
  onPlayRejected?(error: unknown): void;
}

export function useDriftSync(media: MediaHandle | null, input: DriftSyncInput): void {
  const sync = useEffectEvent(() => {
    if (!media) return;

    const { state, clockOffsetMs, canPlay, onPlayRejected } = input;

    const durationSec = media.duration() ?? state?.track?.durationSec ?? null;

    const target = state ? audioPosition(state, { now: Date.now(), clockOffsetMs, durationSec }) : 0;

    const plan = planSync({ shouldPlay: canPlay && !!state?.playing && media.ready(), paused: media.paused(), current: media.currentTime(), target, durationSec });

    if (plan.pause) media.pause();

    if (plan.seekTo !== null) media.seek(plan.seekTo);

    if (plan.play) void Promise.resolve(media.play()).catch((e: unknown) => onPlayRejected?.(e));
  });

  const attached = media !== null;

  const { state, clockOffsetMs, resyncKey } = input;

  useEffect(() => {
    if (attached) sync();
  }, [attached, state, clockOffsetMs, resyncKey]);

  useEffect(() => {
    if (!attached) return;

    const timer = window.setInterval(() => sync(), AUDIO_DRIFT_CHECK_MS);

    return () => window.clearInterval(timer);
  }, [attached]);
}
