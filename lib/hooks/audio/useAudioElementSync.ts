"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type MediaHandle, useDriftSync } from "./useDriftSync";

import type { BattleAudioState } from "@/types/audio";

export interface MediaSyncInput {
  src: string | null;
  state: BattleAudioState | null;
  clockOffsetMs: number;
  unlocked: boolean;
  volume: number;
  muted: boolean;
  /** play() поза жестом відхилено (новий елемент на iOS) — знову потрібна кнопка «Увімкнути звук» */
  onBlocked?(): void;
}

/** Порожній WAV: play() у жесті розблоковує елемент на iOS, коли треку ще немає. */
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

const isBlocked = (e: unknown) => e instanceof Error && e.name === "NotAllowedError";

/** Стабільний адаптер: елемент приходить через ref-колбек, тож рендер не читає ref. */
function elementMedia() {
  let el: HTMLAudioElement | null = null;

  const handle: MediaHandle = {
    ready: () => !!el?.getAttribute("src"),
    currentTime: () => el?.currentTime ?? 0,
    paused: () => el?.paused ?? true,
    duration: () => (el && Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null),
    play: () => el?.play(),
    pause: () => el?.pause(),
    seek: (sec) => {
      if (el && el.readyState >= 1) el.currentTime = sec;
    },
  };

  return { handle, attach: (next: HTMLAudioElement | null) => void (el = next) };
}

export function useAudioElementSync(input: MediaSyncInput): { ref: (el: HTMLAudioElement | null) => void; prime(): void; failed: boolean } {
  const node = useRef<HTMLAudioElement | null>(null);

  // стан лише перезапускає ефекти при зміні елемента; сам елемент змінюється через ref
  const [attached, setAttached] = useState<HTMLAudioElement | null>(null);

  // помилка привʼязана до src: інший трек, YouTube чи «Стоп» прибирають її без скидання в ефекті
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const [loads, setLoads] = useState(0);

  const [media] = useState(elementMedia);

  const ref = useCallback((el: HTMLAudioElement | null) => {
    node.current = el;
    media.attach(el);
    setAttached(el);
  }, [media]);

  const { unlocked, src, state, clockOffsetMs, volume, muted } = input;

  // до useDriftSync: ефекти йдуть за порядком, тож план бачить уже виставлений src
  useEffect(() => {
    const el = node.current;

    if (!attached || !el) return;

    const want = unlocked ? src : null;

    const current = el.getAttribute("src");

    if (want && current !== want) {
      el.src = want;
      el.load();
    } else if (!want && current && current !== SILENT_WAV) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
  }, [attached, unlocked, src]);

  const { onBlocked } = input;

  useDriftSync(attached && media.handle, {
    state,
    clockOffsetMs,
    canPlay: unlocked && !!src,
    resyncKey: `${unlocked}|${src}|${loads}`,
    onPlayRejected: (e) => isBlocked(e) && onBlocked?.(),
  });

  useEffect(() => {
    const el = node.current;

    if (!attached || !el) return;

    el.volume = volume;
    el.muted = muted;
  }, [attached, volume, muted]);

  useEffect(() => {
    const el = node.current;

    if (!attached || !el) return;

    const onLoaded = () => {
      setFailedSrc(null);
      setLoads((n) => n + 1);
    };

    const onError = () => setFailedSrc(el.getAttribute("src"));

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("error", onError);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("error", onError);
    };
  }, [attached]);

  const prime = useCallback(() => {
    const el = node.current;

    if (!el) return;

    if (src && el.getAttribute("src") !== src) el.src = src;
    else if (!el.getAttribute("src")) el.src = SILENT_WAV;

    void el.play().catch(() => undefined);
  }, [src]);

  return { ref, prime, failed: failedSrc !== null && failedSrc === (unlocked ? src : null) };
}
