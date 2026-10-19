"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { type AudioPrefs, useAudioPrefs } from "./useAudioPrefs";
import { type BattleAudioControl, useBattleAudioControl } from "./useBattleAudioControl";
import { useBattleAudioState } from "./useBattleAudioState";
import { useBattleScene } from "./useBattleScene";

import { useTracks } from "@/lib/hooks/tracks";
import type { BattleAudioState, CampaignTrack } from "@/types/audio";

export interface BattleAudioValue {
  state: BattleAudioState | null;
  clockOffsetMs: number;
  sound: { unlocked: boolean; unlock(): void };
  prefs: AudioPrefs;
  control: BattleAudioControl | null;
  library: { tracks: CampaignTrack[]; loading: boolean } | null;
}

export const BattleAudioContext = createContext<BattleAudioValue | null>(null);

const NO_TRACKS: CampaignTrack[] = [];

export function useBattleAudioValue(): BattleAudioValue {
  const { campaignId, battleId, battle, viewer: { isDM }, toast: { show } } = useBattleScene();

  // браузери пускають звук лише після жесту: один клік на кожне відкриття сторінки
  const [unlocked, setUnlocked] = useState(false);

  const { audio, clockOffsetMs } = useBattleAudioState({ campaignId, battleId, seed: battle.audio, live: unlocked });

  const prefs = useAudioPrefs();

  const control = useBattleAudioControl({ campaignId, battleId, enabled: isDM, onFailure: show });

  const { data: tracks = NO_TRACKS, isLoading } = useTracks(campaignId, { enabled: isDM });

  const unlock = useCallback(() => setUnlocked(true), []);

  return useMemo(
    () => ({
      state: audio,
      clockOffsetMs: clockOffsetMs ?? 0,
      sound: { unlocked, unlock },
      prefs,
      control,
      library: isDM ? { tracks, loading: isLoading } : null,
    }),
    [audio, clockOffsetMs, unlocked, unlock, prefs, control, isDM, tracks, isLoading],
  );
}

export function useBattleAudio(): BattleAudioValue {
  const value = useContext(BattleAudioContext);

  if (!value) throw new Error("useBattleAudio: немає BattleAudioContext");

  return value;
}
