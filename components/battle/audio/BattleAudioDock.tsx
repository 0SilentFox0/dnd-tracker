"use client";

import { useCallback, useState } from "react";

import { AudioPlayerPanel } from "./AudioPlayerPanel";
import { NowPlayingLabel } from "./NowPlayingLabel";
import { UnlockSoundButton } from "./UnlockSoundButton";
import { YoutubePlayer } from "./YoutubePlayer";

import { useBattleAudio } from "@/lib/hooks/battle";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

/** corner — у CornerStack зліва внизу (desktop, лобі); strip — рядок нульової висоти над смугою ходу телефона, чип зліва. */
export function BattleAudioDock({ placement }: { placement: "corner" | "strip" }) {
  const { state, sound, dm, prefs } = useBattleAudio();

  const wide = useMediaQuery(DESKTOP_QUERY);

  // на телефоні панель закрила б третину карти — стартує згорнутою
  const [choice, setChoice] = useState<boolean | null>(null);

  const expanded = choice ?? (placement === "corner" && wide);

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
    <div data-battle-audio={placement} className={cn(placement === "strip" && "pointer-events-none relative h-0 shrink-0")}>
      <div className={cn(placement === "strip" && "pointer-events-auto absolute bottom-2 left-2 z-30")}>
        <div data-audio-panel={expanded ? "open" : "collapsed"} aria-hidden={!expanded || undefined} inert={!expanded} className={cn(!expanded && "sr-only")}>
          <AudioPlayerPanel view={{ onCollapse: () => setChoice(false) }}>
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
