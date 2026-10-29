"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Video, Volume2, VolumeX } from "lucide-react";

import { DmAudioControls } from "./DmAudioControls";
import { NowPlayingLabel } from "./NowPlayingLabel";
import { UnlockSoundButton } from "./UnlockSoundButton";

import { usePlayerAudio } from "@/lib/hooks/audio";
import { cn } from "@/lib/utils";

/** capped — висота не більше пів екрана з прокруткою, заголовок липкий */
export function AudioPlayerPanel({ view, children }: { view: { onCollapse(): void; capped?: boolean }; children?: ReactNode }) {
  const t = useTranslations("music");

  const { state, sound, prefs, dm } = usePlayerAudio();

  return (
    <section
      aria-label={t("player.label")}
      className={cn("w-64 rounded-lg border border-hud-rule bg-black/85 p-2 text-xs text-hud-bone shadow-lg", view.capped && "max-h-[50dvh] min-h-0 overflow-y-auto overscroll-contain pt-0")}
    >
      <header data-audio-header className={cn("flex items-center gap-2", view.capped && "sticky top-0 z-10 bg-black pt-2")}>
        <NowPlayingLabel title={state?.track?.title ?? t("player.silence")} className="min-w-0 flex-1" />
        {state?.trackId && !state.playing && <span className="text-hud-muted">{t("player.paused")}</span>}
        {state?.track?.kind === "youtube" && (
          <button
            type="button"
            aria-pressed={prefs.video.shown}
            onClick={() => prefs.video.set(!prefs.video.shown)}
            className={cn("flex items-center gap-1 rounded px-1 hover:text-hud-bone", prefs.video.shown ? "text-hud-gold" : "text-hud-muted")}
          >
            <Video className="size-3.5" />
            {t("player.video")}
          </button>
        )}
        <button type="button" aria-label={t("player.collapse")} onClick={view.onCollapse} className="text-hud-muted hover:text-hud-bone">
          <ChevronDown className="size-4" />
        </button>
      </header>
      {sound.unlocked ? (
        <div className="mt-2 flex items-center gap-2">
          <button type="button" aria-label={prefs.muted ? t("player.muteOn") : t("player.muteOff")} aria-pressed={prefs.muted} onClick={prefs.toggleMute}>
            {prefs.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <input
            type="range"
            aria-label={t("player.volume")}
            min={0}
            max={1}
            step={0.05}
            value={prefs.volume}
            onChange={(e) => prefs.setVolume(Number(e.target.value))}
            className="flex-1 accent-[var(--gold)]"
          />
        </div>
      ) : (
        <UnlockSoundButton className="mt-2 w-full" />
      )}
      {sound.failed && (
        <p role="alert" className="mt-1 text-[var(--enemy)]">
          {t("player.trackUnavailable")}
        </p>
      )}
      {children}
      {dm && <DmAudioControls dm={dm} />}
    </section>
  );
}
