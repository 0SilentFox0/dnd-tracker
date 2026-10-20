"use client";

import type { ReactNode } from "react";

import { BattleAudioContext, useBattleAudioValue } from "@/lib/hooks/battle";

export function BattleAudioProvider({ children }: { children: ReactNode }) {
  const { value, audioRef } = useBattleAudioValue();

  return (
    <BattleAudioContext value={value}>
      <audio ref={audioRef} loop preload="none" hidden />
      {children}
    </BattleAudioContext>
  );
}
