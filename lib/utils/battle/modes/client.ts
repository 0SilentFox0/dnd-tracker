import { activeModeWithConfig, allMapModes, MAP_MODE_REGISTRY } from "./registry";
import type { ModeView } from "./types";

import type { BattleAction, BattleMapConfig } from "@/types/battle";

export const MODE_MAP_KEYS: readonly string[] = Object.keys(MAP_MODE_REGISTRY);

const sameJson = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** Патчі режимів для дельти: { [key]: зміни } або null — потрібна повна карта. */
export function modeDeltas(before: BattleMapConfig, after: BattleMapConfig): Record<string, unknown> | null {
  const patches: Record<string, unknown> = {};

  for (const mode of allMapModes()) {
    const b = mode.configOf(before);

    const a = mode.configOf(after);

    const change = mode.client.deltaOf ? mode.client.deltaOf(b, a) : sameJson(b, a) ? undefined : null;

    if (change === null) return null;

    if (change !== undefined) patches[mode.key] = change;
  }

  return patches;
}

export function mergeModeDeltas(map: BattleMapConfig, scene: Record<string, unknown>): BattleMapConfig | "refetch" {
  let merged = map;

  for (const mode of allMapModes()) {
    const patch = scene[mode.key];

    if (patch === undefined) continue;

    const config = mode.configOf(merged);

    if (config === null) return "refetch";

    const next = mode.client.mergeDelta ? mode.client.mergeDelta(config, patch as never) : { ...(config as object), ...(patch as object) };

    merged = mode.withConfig(merged, next);
  }

  return merged;
}

export function modeLogVisible(map: BattleMapConfig | null | undefined, view: ModeView | null | undefined, e: BattleAction): boolean {
  return activeModeWithConfig(map)?.mode.client.logVisible?.(view, e) ?? true;
}

export function modeFxVisible(map: BattleMapConfig | null | undefined, view: ModeView | null | undefined, e: BattleAction): boolean {
  return activeModeWithConfig(map)?.mode.client.fxVisible?.(view, e) ?? true;
}
