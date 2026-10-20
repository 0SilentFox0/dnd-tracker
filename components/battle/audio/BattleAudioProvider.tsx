"use client";

import type { ReactNode } from "react";

import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { useBattleAudioHost } from "@/lib/hooks/battle";

export function BattleAudioProvider({ children }: { children: ReactNode }) {
  return <AudioPlayerProvider host={useBattleAudioHost()}>{children}</AudioPlayerProvider>;
}
