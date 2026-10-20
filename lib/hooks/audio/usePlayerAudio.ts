"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { AudioHost } from "./host";
import { type AudioControl, useAudioControl } from "./useAudioControl";
import { useAudioElementSync } from "./useAudioElementSync";
import { type AudioPrefs, useAudioPrefs } from "./useAudioPrefs";
import { useAudioState } from "./useAudioState";

import { useRenameTrack, useTracks } from "@/lib/hooks/music";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { BattleAudioState, CampaignTrack } from "@/types/audio";

/** Лише для ДМ: керування, бібліотека кампанії й посилання на сторінку музики. */
export interface PlayerAudioDm {
  control: AudioControl;
  library: { tracks: CampaignTrack[]; isLoading: boolean; rename(id: string, title: string): void };
  musicHref: string;
}

export interface PlayerAudioValue {
  state: BattleAudioState | null;
  clockOffsetMs: number;
  /** failed — файл треку не завантажився */
  sound: { unlocked: boolean; unlock(): void; failed: boolean };
  prefs: AudioPrefs;
  dm: PlayerAudioDm | null;
}

export const AudioPlayerContext = createContext<PlayerAudioValue | null>(null);

const NO_TRACKS: CampaignTrack[] = [];

/** audioRef — єдиний <audio> сторінки в AudioPlayerProvider: iOS розблоковує саме елемент, тож він не мусить перемонтовуватися разом із панеллю. */
export function usePlayerAudioValue(host: AudioHost): { value: PlayerAudioValue; audioRef: (el: HTMLAudioElement | null) => void } {
  const { campaignId, isDM, onFailure } = host;

  // браузери пускають звук лише після жесту: один клік на кожне відкриття сторінки
  const [unlocked, setUnlocked] = useState(false);

  const { audio, clockOffsetMs } = useAudioState({ host, unlocked });

  const prefs = useAudioPrefs();

  const control = useAudioControl(host);

  const { data: tracks = NO_TRACKS, isLoading } = useTracks(campaignId, { enabled: isDM });

  const rename = useRenameTrack(campaignId, (e) => onFailure(errorMessage(e, "Не вдалося перейменувати трек")));

  const track = audio?.track ?? null;

  const relock = useCallback(() => setUnlocked(false), []);

  const media = useAudioElementSync({
    src: track?.kind === "file" ? track.url : null,
    state: audio,
    clockOffsetMs: clockOffsetMs ?? 0,
    unlocked,
    volume: prefs.volume,
    muted: prefs.muted,
    onBlocked: relock,
  });

  const { prime, failed } = media;

  const unlock = useCallback(() => {
    prime();
    setUnlocked(true);
  }, [prime]);

  const dm = useMemo(
    () => (control ? { control, library: { tracks, isLoading, rename }, musicHref: `/campaigns/${campaignId}/dm/music` } : null),
    [control, tracks, isLoading, rename, campaignId],
  );

  const value = useMemo(
    () => ({ state: audio, clockOffsetMs: clockOffsetMs ?? 0, sound: { unlocked, unlock, failed }, prefs, dm }),
    [audio, clockOffsetMs, unlocked, unlock, failed, prefs, dm],
  );

  return { value, audioRef: media.ref };
}

export function usePlayerAudio(): PlayerAudioValue {
  const value = useContext(AudioPlayerContext);

  if (!value) throw new Error("usePlayerAudio: немає AudioPlayerContext");

  return value;
}
