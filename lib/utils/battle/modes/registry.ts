import { NORMAL_MODE } from "./normal";
import type { MapModeDefinition } from "./types";

import type { BattleMapConfig } from "@/types/battle";

export const MAP_MODE_REGISTRY = {} as const satisfies Record<string, MapModeDefinition<never>>;

export type MapModeKey = keyof typeof MAP_MODE_REGISTRY;

const testModes: MapModeDefinition<unknown>[] = [];

export const allMapModes = (): MapModeDefinition<unknown>[] => [...(Object.values(MAP_MODE_REGISTRY) as MapModeDefinition<unknown>[]), ...testModes];

/** Лише для тестів: зареєструвати фіктивний режим; повертає функцію зняття. */
export function registerTestMode(mode: MapModeDefinition<unknown>): () => void {
  testModes.push(mode);

  return () => void testModes.splice(testModes.indexOf(mode), 1);
}

export function activeMapMode(map: BattleMapConfig | null | undefined): MapModeDefinition<unknown> {
  if (!map) return NORMAL_MODE as MapModeDefinition<unknown>;

  return allMapModes().find((m) => m.configOf(map) !== null) ?? (NORMAL_MODE as MapModeDefinition<unknown>);
}

/** Активний режим разом із його конфігом (для викликів хуків). */
export function activeModeWithConfig(map: BattleMapConfig | null | undefined): { mode: MapModeDefinition<unknown>; config: unknown; map: BattleMapConfig } | null {
  if (!map) return null;

  const mode = activeMapMode(map);

  const config = mode.configOf(map);

  return config === null ? null : { mode, config, map };
}
