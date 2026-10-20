"use client";

import { useCallback } from "react";

import { useBattleSceneData } from "../../useBattleScene";
import { IDLE_MAZE_TOOL, useMazeToolState } from "./useMazeToolState";

import type { AddParticipantData } from "@/types/battle";

/** Юніт із діалогу «Додати» ставиться кліком по клітинці лабіринту; undefined — не лабіринт або не ДМ. */
export function useMazePlaceUnit(): ((body: AddParticipantData) => void) | undefined {
  const { battle, viewer } = useBattleSceneData();

  const { patch } = useMazeToolState();

  const place = useCallback((body: AddParticipantData) => patch({ ...IDLE_MAZE_TOOL, tool: "placeUnit", pendingUnit: body }), [patch]);

  return viewer.isDM && battle.map?.maze ? place : undefined;
}
