import type { ComponentType, ReactNode } from "react";

import type { ModeView } from "@/lib/utils/battle/modes";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

export interface MapModeUi {
  /** Шари всередині трансформованої карти (над місцевістю, під жетонами). */
  MapLayers?: ComponentType<{ map: BattleMapConfig; view: ModeView | null; rotated: boolean; editing: unknown }>;
  /** Поверх карти (поза трансформацією). */
  MapOverlay?: ComponentType<{ view: ModeView | null; participants: BattleParticipant[] }>;
  Toolbar?: ComponentType<{ tools: unknown; tall: boolean }>;
  EditPalette?: ComponentType<{ tools: unknown }>;
  TurnControls?: ComponentType<{ hero: BattleParticipant }>;
  SetupToggle?: ComponentType<{ checked: boolean; onChange: (on: boolean) => void }>;
  /** Провайдери всіх режимів реєстру вкладені завжди; без свого конфігу кожен нейтральний. */
  SceneProvider?: ComponentType<{ children: ReactNode }>;
  hidesTerrain: boolean;
}
