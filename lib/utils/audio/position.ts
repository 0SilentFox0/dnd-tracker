import { AUDIO_DRIFT_TOLERANCE_SEC } from "@/lib/constants/music";
import type { BattleAudioState } from "@/types/audio";

export function audioPosition(
  state: Pick<BattleAudioState, "playing" | "offsetSec" | "startedAt">,
  at: { now: number; clockOffsetMs: number; durationSec: number | null },
): number {
  const raw = state.playing ? state.offsetSec + Math.max(0, at.now + at.clockOffsetMs - state.startedAt) / 1000 : state.offsetSec;

  return at.durationSec && at.durationSec > 0 ? raw % at.durationSec : raw;
}

export function loopDrift(current: number, target: number, durationSec: number | null): number {
  const d = Math.abs(current - target);

  if (!durationSec || durationSec <= 0) return d;

  const m = d % durationSec;

  return Math.min(m, durationSec - m);
}

export interface SyncInput {
  shouldPlay: boolean;
  paused: boolean;
  current: number;
  target: number;
  durationSec: number | null;
}

export interface SyncPlan {
  seekTo: number | null;
  play: boolean;
  pause: boolean;
}

export function planSync(i: SyncInput): SyncPlan {
  if (!i.shouldPlay) return { seekTo: null, play: false, pause: !i.paused };

  return { seekTo: loopDrift(i.current, i.target, i.durationSec) > AUDIO_DRIFT_TOLERANCE_SEC ? i.target : null, play: i.paused, pause: false };
}
