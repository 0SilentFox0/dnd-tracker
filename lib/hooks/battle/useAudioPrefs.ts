"use client";

import { useMemo } from "react";

import { AUDIO_MUTED_KEY, AUDIO_PLAYLIST_KEY, AUDIO_VIDEO_KEY, AUDIO_VOLUME_KEY, DEFAULT_AUDIO_VOLUME } from "@/lib/constants/music";
import { createStorageFlag, createStorageNumber, useStorageFlag, useStorageNumber } from "@/lib/hooks/common";

export interface AudioPrefs {
  volume: number;
  muted: boolean;
  setVolume(v: number): void;
  toggleMute(): void;
  video: { shown: boolean; set(v: boolean): void };
  playlist: { open: boolean; set(v: boolean): void };
}

const volumeStore = createStorageNumber(AUDIO_VOLUME_KEY, DEFAULT_AUDIO_VOLUME, (v) => Math.min(1, Math.max(0, v)));

const mutedFlag = createStorageFlag(AUDIO_MUTED_KEY, false);

const videoFlag = createStorageFlag(AUDIO_VIDEO_KEY, true);

const playlistFlag = createStorageFlag(AUDIO_PLAYLIST_KEY, true);

export function useAudioPrefs(): AudioPrefs {
  const volume = useStorageNumber(volumeStore, DEFAULT_AUDIO_VOLUME);

  const muted = useStorageFlag(mutedFlag, false);

  const video = useStorageFlag(videoFlag, true);

  const playlist = useStorageFlag(playlistFlag, true);

  return useMemo(
    () => ({
      volume,
      muted,
      setVolume: volumeStore.set,
      toggleMute: () => mutedFlag.set(!mutedFlag.get()),
      video: { shown: video, set: videoFlag.set },
      playlist: { open: playlist, set: playlistFlag.set },
    }),
    [volume, muted, video, playlist],
  );
}
