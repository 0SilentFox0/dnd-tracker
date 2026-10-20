import { MAZE_UI } from "./maze";
import type { MapModeUi } from "./types";

import { activeMapMode, type MapModeKey } from "@/lib/utils/battle/modes";
import type { BattleMapConfig } from "@/types/battle";

export const MAP_MODE_UI: Record<MapModeKey, MapModeUi> = { maze: MAZE_UI };

export function modeUiOf(map: BattleMapConfig | null | undefined): MapModeUi | null {
  return (MAP_MODE_UI as Partial<Record<string, MapModeUi>>)[activeMapMode(map).key] ?? null;
}
