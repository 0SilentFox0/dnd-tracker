"use client";

import { useMemo } from "react";

import { AUDIO_MUTED_KEY, AUDIO_VOLUME_KEY, DEFAULT_AUDIO_VOLUME } from "@/lib/constants/music";
import { createStorageFlag, createStorageNumber, useStorageFlag, useStorageNumber } from "@/lib/hooks/common";

export interface AudioPrefs {
  volume: number;
  muted: boolean;
  setVolume(v: number): void;
  toggleMute(): void;
}

const volumeStore = createStorageNumber(AUDIO_VOLUME_KEY, DEFAULT_AUDIO_VOLUME, (v) => Math.min(1, Math.max(0, v)));

const mutedFlag = createStorageFlag(AUDIO_MUTED_KEY, false);

export function useAudioPrefs(): AudioPrefs {
  const volume = useStorageNumber(volumeStore, DEFAULT_AUDIO_VOLUME);

  const muted = useStorageFlag(mutedFlag, false);

  return useMemo(() => ({ volume, muted, setVolume: volumeStore.set, toggleMute: () => mutedFlag.set(!mutedFlag.get()) }), [volume, muted]);
}
