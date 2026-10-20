"use client";

import type { ReactNode } from "react";

import { type AudioHost, AudioPlayerContext, usePlayerAudioValue } from "@/lib/hooks/audio";

export function AudioPlayerProvider({ host, children }: { host: AudioHost; children: ReactNode }) {
  const { value, audioRef } = usePlayerAudioValue(host);

  return (
    <AudioPlayerContext value={value}>
      <audio ref={audioRef} loop preload="none" hidden />
      {children}
    </AudioPlayerContext>
  );
}
