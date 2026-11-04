import { MAP_MOTION_DEFAULT_SPEED, MAP_MOTION_EASE_SECONDS, MAP_MOTION_MAX_SPEED } from "@/lib/constants/battle-motion";
import { clamp } from "@/lib/utils/common/clamp";
import type { MapMotion } from "@/types/battle";

export function clampMotionSpeed(v: number): number {
  if (Number.isNaN(v)) return 0;

  return Math.round(clamp(v, -MAP_MOTION_MAX_SPEED, MAP_MOTION_MAX_SPEED) * 10) / 10;
}

export function motionInMapSpace(m: MapMotion, rotated: boolean): MapMotion {
  if (!rotated) return m;

  return m.axis === "x" ? { axis: "y", speed: -m.speed } : { axis: "x", speed: m.speed };
}

export function stepMotion(s: { phase: number; speed: number }, target: number, dt: number, period: number): { phase: number; speed: number } {
  const speed = s.speed + (target - s.speed) * (1 - Math.exp(-dt / MAP_MOTION_EASE_SECONDS));

  const phase = (((s.phase + speed * dt) % period) + period) % period;

  return { phase, speed };
}

export function mirrorTileCount(mapLen: number, tileLen: number): number {
  if (tileLen <= 0) return 2;

  const needed = Math.ceil((mapLen + 2 * tileLen) / tileLen);

  return Math.max(2, needed + (needed % 2));
}

export function resumeSpeed(last: number | null): number {
  return last ? last : MAP_MOTION_DEFAULT_SPEED;
}
