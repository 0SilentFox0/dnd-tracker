"use client";

import { useState } from "react";
import { Music } from "lucide-react";

import { AudioPlayerPanel } from "./AudioPlayerPanel";
import { YoutubeAudioDriver } from "./YoutubeAudioDriver";

import { useAudioElementSync, useBattleAudio } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

/** corner — fixed справа внизу (desktop, лобі); strip — рядок нульової висоти над смугою ходу телефона. */
export function BattleAudioDock({ placement }: { placement: "corner" | "strip" }) {
  const audio = useBattleAudio();

  const { state, sound, prefs, control, clockOffsetMs } = audio;

  const [expanded, setExpanded] = useState(true);

  const track = state?.track ?? null;

  const { ref, prime, failed } = useAudioElementSync({ src: track?.kind === "file" ? track.url : null, state, clockOffsetMs, active: sound.unlocked, volume: prefs.volume, muted: prefs.muted });

  if (!track && !control) return null;

  const unlock = () => {
    prime();
    sound.unlock();
  };

  // iframe лише в розгорнутій панелі: прихований YouTube-звук заборонений правилами
  const youtubeId = sound.unlocked && expanded && track?.kind === "youtube" ? track.youtubeId : null;

  return (
    <div data-battle-audio={placement} className={cn(placement === "corner" ? "fixed bottom-4 right-4 z-40" : "pointer-events-none relative h-0 shrink-0")}>
      <div className={cn(placement === "strip" && "pointer-events-auto absolute bottom-2 right-2 z-30")}>
        <audio ref={ref} loop preload="none" hidden />
        {expanded ? (
          <AudioPlayerPanel audio={audio} view={{ failed, onCollapse: () => setExpanded(false), onUnlock: unlock }}>
            {youtubeId && <YoutubeAudioDriver videoId={youtubeId} />}
          </AudioPlayerPanel>
        ) : (
          <button
            type="button"
            aria-label={`Розгорнути плеєр: ${track?.title ?? "Музика"}`}
            onClick={() => setExpanded(true)}
            className="flex max-w-48 items-center gap-1.5 rounded-full border border-hud-rule bg-black/85 px-3 py-1.5 text-xs text-hud-bone shadow-lg"
          >
            <Music className="size-4 shrink-0 text-hud-gold" />
            <span className="truncate">{track?.title ?? "Музика"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
