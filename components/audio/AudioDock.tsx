"use client";

import { useCallback, useState } from "react";

import { AudioPlayerPanel } from "./AudioPlayerPanel";
import { NowPlayingLabel } from "./NowPlayingLabel";
import { UnlockSoundButton } from "./UnlockSoundButton";
import { YoutubePlayer } from "./YoutubePlayer";

import { usePlayerAudio } from "@/lib/hooks/audio";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

/**
 * corner — у CornerStack зліва внизу (desktop, лобі); strip — шар над областю карти/списку телефона, чип зліва внизу.
 * collapseOn — ідентичність ходу: нове не-null значення згортає панель (вікно ходу забирає ту саму висоту).
 * collapseTick — лічильник: кожне зростання (розгорнуте вікно ходу на телефоні) теж згортає панель.
 */
export function AudioDock({ placement, collapseOn = null, collapseTick = 0 }: { placement: "corner" | "strip"; collapseOn?: string | null; collapseTick?: number }) {
  const { state, sound, dm, prefs } = usePlayerAudio();

  const wide = useMediaQuery(DESKTOP_QUERY);

  // на телефоні панель закрила б третину карти — стартує згорнутою
  const [choice, setChoice] = useState<boolean | null>(null);

  const [seenCollapseOn, setSeenCollapseOn] = useState(collapseOn);

  const [seenTick, setSeenTick] = useState(collapseTick);

  if (collapseOn !== seenCollapseOn || collapseTick !== seenTick) {
    setSeenCollapseOn(collapseOn);
    setSeenTick(collapseTick);

    if ((collapseOn !== null && collapseOn !== seenCollapseOn) || collapseTick > seenTick) setChoice(false);
  }

  const expanded = choice ?? (placement === "corner" && wide);

  const strip = placement === "strip";

  const showVideo = prefs.video.set;

  // iOS чекає дотику до ▶ у самому плеєрі — його треба показати
  const onNeedsTap = useCallback(() => {
    showVideo(true);
    setChoice(true);
  }, [showVideo]);

  const track = state?.track ?? null;

  if (!track && !dm) return null;

  // згорнута панель лишає iframe змонтованим (звук іде), лише ховає його з екрана
  const youtubeId = sound.unlocked && track?.kind === "youtube" ? track.youtubeId : null;

  return (
    // strip: панель стискається до висоти шару й гортається, тож заголовок із «Згорнути» не виходить за верх
    <div data-battle-audio={placement} className={cn(strip && "pointer-events-none absolute inset-2 z-40 flex flex-col items-start justify-end")}>
      <div className={cn(strip && "pointer-events-auto flex min-h-0 flex-col")}>
        <div data-audio-panel={expanded ? "open" : "collapsed"} aria-hidden={!expanded || undefined} inert={!expanded} className={cn(!expanded ? "sr-only" : strip && "flex min-h-0 flex-col")}>
          <AudioPlayerPanel view={{ onCollapse: () => setChoice(false), capped: strip }}>
            {youtubeId && <YoutubePlayer videoId={youtubeId} onNeedsTap={onNeedsTap} />}
          </AudioPlayerPanel>
        </div>
        {!expanded && (
          <div className="flex items-center gap-1.5">
            {track && !sound.unlocked && <UnlockSoundButton className="px-3" />}
            <button
              type="button"
              aria-label={`Розгорнути плеєр: ${track?.title ?? "Музика"}`}
              onClick={() => setChoice(true)}
              className="flex max-w-48 items-center gap-1.5 rounded-full border border-hud-rule bg-black/85 px-3 py-1.5 text-xs text-hud-bone shadow-lg"
            >
              <NowPlayingLabel title={track?.title ?? "Музика"} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
