"use client";

import { useMazeModeTools } from "./maze/useMazeModeTools";
import { useMazeDarkAutoSkip, useMazePlaceUnit } from "./maze";

import { activeMapMode, type MapModeKey } from "@/lib/utils/battle/modes";
import type { AddParticipantData, BattleMapConfig, GridPoint } from "@/types/battle";

export interface ModeTools {
  /** панорамування заблоковано (малювання стін) */
  panLocked: boolean;
  /** клік по клітинці перехоплено інструментом */
  toolActive: boolean;
  clickCell(cell: GridPoint): void;
  closeTool(): void;
  /** передається в Toolbar/EditPalette/MapLayers режиму як `tools`/`editing` */
  raw: unknown;
  paletteOpen: boolean;
}

type ByMode<T> = Partial<Record<string, T>>;

// Хуки всіх режимів реєстру викликаються безумовно: режим карти може змінитися між рендерами.
export function useModeTools(map: BattleMapConfig | null | undefined): ModeTools | null {
  const results = { maze: useMazeModeTools() } satisfies Record<MapModeKey, ModeTools | null>;

  return (results as ByMode<ModeTools | null>)[activeMapMode(map).key] ?? null;
}

export function useModeDmPlace(map: BattleMapConfig | null | undefined): ((body: AddParticipantData) => void) | undefined {
  const results = { maze: useMazePlaceUnit() } satisfies Record<MapModeKey, ((body: AddParticipantData) => void) | undefined>;

  return (results as ByMode<(body: AddParticipantData) => void>)[activeMapMode(map).key];
}

export function useModeAutoSkip(): void {
  void ({ maze: useMazeDarkAutoSkip() } satisfies Record<MapModeKey, void>);
}
