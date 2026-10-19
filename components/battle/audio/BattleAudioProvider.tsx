"use client";

import type { ReactNode } from "react";

import { BattleAudioContext, useBattleAudioValue } from "@/lib/hooks/battle";

export function BattleAudioProvider({ children }: { children: ReactNode }) {
  const value = useBattleAudioValue();

  return <BattleAudioContext value={value}>{children}</BattleAudioContext>;
}
