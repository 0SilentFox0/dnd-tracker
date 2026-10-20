"use client";

import { useEffect } from "react";

import { YOUTUBE_PLAYER_PX } from "@/lib/constants/music";
import { useBattleAudio, useYoutubeSync } from "@/lib/hooks/battle";

/** Розгорнута панель показує плеєр не менше 200×200 (вимога YouTube); у згорнутій він лише схований — рішення користувача. */
export function YoutubeAudioDriver({ videoId, onNeedsTap }: { videoId: string; onNeedsTap(): void }) {
  const { state, clockOffsetMs, prefs } = useBattleAudio();

  const { ref, needsTap, failed } = useYoutubeSync({ videoId, state, clockOffsetMs, volume: prefs.volume, muted: prefs.muted });

  useEffect(() => {
    if (needsTap) onNeedsTap();
  }, [needsTap, onNeedsTap]);

  return (
    <div className="mt-2 flex flex-col items-center gap-1">
      <div data-youtube-player ref={ref} className="overflow-hidden rounded bg-black" style={{ width: YOUTUBE_PLAYER_PX, height: YOUTUBE_PLAYER_PX }} />
      {needsTap && <p className="text-hud-muted">Торкніться ▶ у плеєрі</p>}
      {failed && <p role="alert" className="text-[var(--enemy)]">Відео недоступне для вбудовування</p>}
    </div>
  );
}
