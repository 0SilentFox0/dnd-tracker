"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { useAudioElementSync } from "./useAudioElementSync";
import { type AudioPrefs, useAudioPrefs } from "./useAudioPrefs";
import { type BattleAudioControl, useBattleAudioControl } from "./useBattleAudioControl";
import { useBattleAudioState } from "./useBattleAudioState";
import { useBattleScene } from "./useBattleScene";

import { useRenameTrack, useTracks } from "@/lib/hooks/music";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { BattleAudioState, CampaignTrack } from "@/types/audio";

/** Лише для ДМ: керування, бібліотека кампанії й посилання на сторінку музики. */
export interface BattleAudioDm {
  control: BattleAudioControl;
  library: { tracks: CampaignTrack[]; isLoading: boolean; rename(id: string, title: string): void };
  musicHref: string;
}

export interface BattleAudioValue {
  state: BattleAudioState | null;
  clockOffsetMs: number;
  /** failed — файл треку не завантажився */
  sound: { unlocked: boolean; unlock(): void; failed: boolean };
  prefs: AudioPrefs;
  dm: BattleAudioDm | null;
}

export const BattleAudioContext = createContext<BattleAudioValue | null>(null);

const NO_TRACKS: CampaignTrack[] = [];

/** audioRef — єдиний <audio> сторінки в BattleAudioProvider: iOS розблоковує саме елемент, тож він не мусить перемонтовуватися разом із панеллю. */
export function useBattleAudioValue(): { value: BattleAudioValue; audioRef: (el: HTMLAudioElement | null) => void } {
  const { campaignId, battleId, battle, viewer: { isDM }, toast: { show } } = useBattleScene();

  // браузери пускають звук лише після жесту: один клік на кожне відкриття сторінки
  const [unlocked, setUnlocked] = useState(false);

  const { audio, clockOffsetMs } = useBattleAudioState({ campaignId, battleId, seed: battle.audio, unlocked });

  const prefs = useAudioPrefs();

  const control = useBattleAudioControl({ campaignId, battleId, enabled: isDM, onFailure: show });

  const { data: tracks = NO_TRACKS, isLoading } = useTracks(campaignId, { enabled: isDM });

  const rename = useRenameTrack(campaignId, (e) => show(errorMessage(e, "Не вдалося перейменувати трек")));

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

export function useBattleAudio(): BattleAudioValue {
  const value = useContext(BattleAudioContext);

  if (!value) throw new Error("useBattleAudio: немає BattleAudioContext");

  return value;
}
