"use client";

import { useBattleScene } from "./useBattleScene";

import type { BattleParticipant } from "@/types/battle";

export function useSelectedParticipant(): BattleParticipant | null {
  const { battle, selectedId } = useBattleScene();

  return battle.initiativeOrder.find((p) => p.basicInfo.id === selectedId) ?? null;
}
