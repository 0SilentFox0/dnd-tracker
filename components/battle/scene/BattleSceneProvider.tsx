"use client";

import type { ReactNode } from "react";

import { BattleSceneContext, type BattleSceneValue } from "@/lib/hooks/battle";

export function BattleSceneProvider({ value, children }: { value: BattleSceneValue; children: ReactNode }) {
  return <BattleSceneContext.Provider value={value}>{children}</BattleSceneContext.Provider>;
}
