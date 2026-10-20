"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { AddParticipantData, GridPoint, MazeDifficulty } from "@/types/battle";

export type MazeTool = "none" | "walls" | "exit" | "teleport" | "fog" | "placeUnit";

export interface MazeGenerateInput {
  difficulty: MazeDifficulty;
  teleportPairs: number;
  fogPatches: number;
  exit: "random" | "pick";
}

export interface MazeToolStateValue {
  tool: MazeTool;
  /** юніт із діалогу «Додати», що чекає на клітинку */
  pendingUnit: AddParticipantData | null;
  /** «Згенерувати» з виходом «Вибрати на карті» чекає на клітинку */
  pendingGenerate: Omit<MazeGenerateInput, "exit"> | null;
  teleportFrom: GridPoint | null;
}

export interface MazeToolState {
  state: MazeToolStateValue;
  patch(next: Partial<MazeToolStateValue>): void;
}

export const IDLE_MAZE_TOOL: MazeToolStateValue = { tool: "none", pendingUnit: null, pendingGenerate: null, teleportFrom: null };

/** Спільний стан інструментів: діалог «Додати» в панелі ДМ і карта — різні гілки дерева. */
export const MazeToolStateContext = createContext<MazeToolState | null>(null);

const NO_TOOL_STATE: MazeToolState = { state: IDLE_MAZE_TOOL, patch: () => {} };

export function useMazeToolStateValue(): MazeToolState {
  const [state, setState] = useState(IDLE_MAZE_TOOL);

  return useMemo(() => ({ state, patch: (next) => setState((s) => ({ ...s, ...next })) }), [state]);
}

export function useMazeToolState(): MazeToolState {
  return useContext(MazeToolStateContext) ?? NO_TOOL_STATE;
}
