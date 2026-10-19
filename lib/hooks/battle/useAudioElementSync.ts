"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AUDIO_DRIFT_CHECK_MS } from "@/lib/constants/music";
import { audioPosition, planSync } from "@/lib/utils/audio/position";
import type { BattleAudioState } from "@/types/audio";

export interface MediaSyncInput {
  src: string | null;
  state: BattleAudioState | null;
  clockOffsetMs: number;
  active: boolean;
  volume: number;
  muted: boolean;
}

/** Порожній WAV: play() у жесті розблоковує елемент на iOS, коли треку ще немає. */
export const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

const durationOf = (el: HTMLAudioElement, state: BattleAudioState | null) => (Number.isFinite(el.duration) && el.duration > 0 ? el.duration : (state?.track?.durationSec ?? null));

export function useAudioElementSync(input: MediaSyncInput): { ref: (el: HTMLAudioElement | null) => void; prime(): void; failed: boolean } {
  const node = useRef<HTMLAudioElement | null>(null);

  // state only re-runs the effects when the element changes; it is mutated through the ref
  const [attached, setAttached] = useState<HTMLAudioElement | null>(null);

  const [failed, setFailed] = useState(false);

  const latest = useRef(input);

  useEffect(() => {
    latest.current = input;
  });

  const ref = useCallback((el: HTMLAudioElement | null) => {
    node.current = el;
    setAttached(el);
  }, []);

  const sync = useCallback(() => {
    const el = node.current;

    if (!el) return;

    const { state, clockOffsetMs, active, src } = latest.current;

    const durationSec = durationOf(el, state);

    const target = state ? audioPosition(state, { now: Date.now(), clockOffsetMs, durationSec }) : 0;

    const plan = planSync({ shouldPlay: active && !!state?.playing && !!src && el.getAttribute("src") === src, paused: el.paused, current: el.currentTime, target, durationSec });

    if (plan.pause) el.pause();

    if (plan.seekTo !== null && el.readyState >= 1) el.currentTime = plan.seekTo;

    if (plan.play) void el.play().catch(() => undefined);
  }, []);

  const { active, src, state, clockOffsetMs, volume, muted } = input;

  useEffect(() => {
    const el = node.current;

    if (!attached || !el) return;

    const want = active ? src : null;

    const current = el.getAttribute("src");

    if (want && current !== want) {
      el.src = want;
      el.load();
    } else if (!want && current && current !== SILENT_WAV) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }

    sync();
  }, [attached, active, src, state, clockOffsetMs, sync]);

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
      setFailed(false);
      sync();
    };

    const onError = () => setFailed(true);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("error", onError);

    const timer = window.setInterval(sync, AUDIO_DRIFT_CHECK_MS);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("error", onError);
      window.clearInterval(timer);
    };
  }, [attached, sync]);

  const prime = useCallback(() => {
    const el = node.current;

    if (!el) return;

    const want = latest.current.src;

    if (want && el.getAttribute("src") !== want) el.src = want;
    else if (!el.getAttribute("src")) el.src = SILENT_WAV;

    void el.play().catch(() => undefined);
  }, []);

  return { ref, prime, failed };
}
