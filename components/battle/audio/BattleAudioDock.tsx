"use client";

import { useCallback, useState } from "react";
import { Music } from "lucide-react";

import { AudioPlayerPanel } from "./AudioPlayerPanel";
import { YoutubeAudioDriver } from "./YoutubeAudioDriver";

import { Button } from "@/components/ui/button";
import { useBattleAudio } from "@/lib/hooks/battle";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

/** corner — у CornerStack зліва внизу (desktop, лобі); strip — рядок нульової висоти над смугою ходу телефона, чип зліва. */
export function BattleAudioDock({ placement }: { placement: "corner" | "strip" }) {
  const audio = useBattleAudio();

  const { state, sound, control, prefs } = audio;

  const wide = useMediaQuery("(min-width: 1024px)");

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

  if (!track && !control) return null;

  // згорнута панель лишає iframe змонтованим (звук іде), лише ховає його з екрана
  const youtubeId = sound.unlocked && track?.kind === "youtube" ? track.youtubeId : null;

  return (
    <div data-battle-audio={placement} className={cn(placement === "strip" && "pointer-events-none relative h-0 shrink-0")}>
      <div className={cn(placement === "strip" && "pointer-events-auto absolute bottom-2 left-2 z-30")}>
        <div data-audio-panel={expanded ? "open" : "collapsed"} aria-hidden={!expanded || undefined} inert={!expanded} className={cn(!expanded && "sr-only")}>
          <AudioPlayerPanel audio={audio} view={{ failed: sound.failed, onCollapse: () => setChoice(false), onUnlock: sound.unlock }}>
            {youtubeId && <YoutubeAudioDriver videoId={youtubeId} onNeedsTap={onNeedsTap} />}
          </AudioPlayerPanel>
        </div>
        {!expanded && (
          <div className="flex items-center gap-1.5">
            {track && !sound.unlocked && (
              <Button size="sm" className="rounded-full" onClick={sound.unlock}>
                Увімкнути звук
              </Button>
            )}
            <button
              type="button"
              aria-label={`Розгорнути плеєр: ${track?.title ?? "Музика"}`}
              onClick={() => setChoice(true)}
              className="flex max-w-48 items-center gap-1.5 rounded-full border border-hud-rule bg-black/85 px-3 py-1.5 text-xs text-hud-bone shadow-lg"
            >
              <Music className="size-4 shrink-0 text-hud-gold" />
              <span className="truncate">{track?.title ?? "Музика"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
