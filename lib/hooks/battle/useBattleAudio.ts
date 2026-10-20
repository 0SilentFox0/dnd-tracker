"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { useAudioElementSync } from "./useAudioElementSync";
import { type AudioPrefs, useAudioPrefs } from "./useAudioPrefs";
import { type BattleAudioControl, useBattleAudioControl } from "./useBattleAudioControl";
import { useBattleAudioState } from "./useBattleAudioState";
import { useBattleScene } from "./useBattleScene";

import { useRenameTrack, useTracks } from "@/lib/hooks/tracks";
import type { BattleAudioState, CampaignTrack } from "@/types/audio";

export interface BattleAudioValue {
  state: BattleAudioState | null;
  clockOffsetMs: number;
  /** failed — файл треку не завантажився */
  sound: { unlocked: boolean; unlock(): void; failed: boolean };
  prefs: AudioPrefs;
  control: BattleAudioControl | null;
  library: { tracks: CampaignTrack[]; loading: boolean; rename(id: string, title: string): void } | null;
}

export const BattleAudioContext = createContext<BattleAudioValue | null>(null);

const NO_TRACKS: CampaignTrack[] = [];

/** audioRef — єдиний <audio> сторінки в BattleAudioProvider: iOS розблоковує саме елемент, тож він не мусить перемонтовуватися разом із панеллю. */
export function useBattleAudioValue(): { value: BattleAudioValue; audioRef: (el: HTMLAudioElement | null) => void } {
  const { campaignId, battleId, battle, viewer: { isDM }, toast: { show } } = useBattleScene();

  // браузери пускають звук лише після жесту: один клік на кожне відкриття сторінки
  const [unlocked, setUnlocked] = useState(false);

  const { audio, clockOffsetMs } = useBattleAudioState({ campaignId, battleId, seed: battle.audio, live: unlocked });

  const prefs = useAudioPrefs();

  const control = useBattleAudioControl({ campaignId, battleId, enabled: isDM, onFailure: show });

  const { data: tracks = NO_TRACKS, isLoading } = useTracks(campaignId, { enabled: isDM });

  const rename = useRenameTrack(campaignId, (e) => show(e instanceof Error && e.message ? e.message : "Не вдалося перейменувати трек"));

  const track = audio?.track ?? null;

  const relock = useCallback(() => setUnlocked(false), []);

  const media = useAudioElementSync({
    src: track?.kind === "file" ? track.url : null,
    state: audio,
    clockOffsetMs: clockOffsetMs ?? 0,
    active: unlocked,
    volume: prefs.volume,
    muted: prefs.muted,
    onBlocked: relock,
  });

  const { prime, failed } = media;

  const unlock = useCallback(() => {
    prime();
    setUnlocked(true);
  }, [prime]);

  const value = useMemo(
    () => ({
      state: audio,
      clockOffsetMs: clockOffsetMs ?? 0,
      sound: { unlocked, unlock, failed },
      prefs,
      control,
      library: isDM ? { tracks, loading: isLoading, rename } : null,
    }),
    [audio, clockOffsetMs, unlocked, unlock, failed, prefs, control, isDM, tracks, isLoading, rename],
  );

  return { value, audioRef: media.ref };
}

export function useBattleAudio(): BattleAudioValue {
  const value = useContext(BattleAudioContext);

  if (!value) throw new Error("useBattleAudio: немає BattleAudioContext");

  return value;
}
