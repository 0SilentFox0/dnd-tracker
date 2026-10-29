"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { YOUTUBE_PLAYER_PX } from "@/lib/constants/music";
import { usePlayerAudio, useYoutubeSync } from "@/lib/hooks/audio";
import { cn } from "@/lib/utils";

/** Видимий YouTube-плеєр. Показане відео — не менше 200×200 (вимога YouTube); сховане (перемикач «Відео» чи згорнута панель) лишає iframe змонтованим, тож звук іде. */
export function YoutubePlayer({ videoId, onNeedsTap }: { videoId: string; onNeedsTap(): void }) {
  const t = useTranslations("music");

  const { state, clockOffsetMs, prefs } = usePlayerAudio();

  const { ref, needsTap, failed } = useYoutubeSync({ videoId, state, clockOffsetMs, volume: prefs.volume, muted: prefs.muted });

  useEffect(() => {
    if (needsTap) onNeedsTap();
  }, [needsTap, onNeedsTap]);

  const shown = prefs.video.shown;

  return (
    <div className="mt-2 flex flex-col items-center gap-1">
      <div data-youtube-video={shown ? "shown" : "hidden"} aria-hidden={!shown || undefined} inert={!shown} className={cn(!shown && "sr-only")}>
        <div data-youtube-player ref={ref} className="overflow-hidden rounded bg-black" style={{ width: YOUTUBE_PLAYER_PX, height: YOUTUBE_PLAYER_PX }} />
      </div>
      {needsTap && <p className="text-hud-muted">{t("player.tapPlayer")}</p>}
      {failed && <p role="alert" className="text-[var(--enemy)]">{t("player.videoUnavailable")}</p>}
    </div>
  );
}
