"use client";

import type { ReactNode } from "react";
import { ChevronDown, Music, Video, Volume2, VolumeX } from "lucide-react";

import { DmAudioControls } from "./DmAudioControls";

import type { BattleAudioValue } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

export interface AudioPanelView {
  failed: boolean;
  onCollapse(): void;
  onUnlock(): void;
}

export function AudioPlayerPanel({ audio, view, children }: { audio: BattleAudioValue; view: AudioPanelView; children?: ReactNode }) {
  const { state, sound, prefs, control, library } = audio;

  const title = state?.track?.title ?? "Тиша";

  return (
    <section aria-label="Музика бою" className="w-64 rounded-lg border border-hud-rule bg-black/85 p-2 text-xs text-hud-bone shadow-lg">
      <header className="flex items-center gap-2">
        <Music className="size-4 shrink-0 text-hud-gold" />
        <span className="min-w-0 flex-1 truncate" title={title}>
          {title}
        </span>
        {state?.trackId && !state.playing && <span className="text-hud-muted">пауза</span>}
        {state?.track?.kind === "youtube" && (
          <button
            type="button"
            aria-pressed={prefs.video.shown}
            onClick={() => prefs.video.set(!prefs.video.shown)}
            className={cn("flex items-center gap-1 rounded px-1 hover:text-hud-bone", prefs.video.shown ? "text-hud-gold" : "text-hud-muted")}
          >
            <Video className="size-3.5" />
            Відео
          </button>
        )}
        <button type="button" aria-label="Згорнути плеєр" onClick={view.onCollapse} className="text-hud-muted hover:text-hud-bone">
          <ChevronDown className="size-4" />
        </button>
      </header>
      {sound.unlocked ? (
        <div className="mt-2 flex items-center gap-2">
          <button type="button" aria-label={prefs.muted ? "Увімкнути звук у мене" : "Вимкнути звук у мене"} aria-pressed={prefs.muted} onClick={prefs.toggleMute}>
            {prefs.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <input
            type="range"
            aria-label="Гучність"
            min={0}
            max={1}
            step={0.05}
            value={prefs.volume}
            onChange={(e) => prefs.setVolume(Number(e.target.value))}
            className="flex-1 accent-[var(--gold)]"
          />
        </div>
      ) : (
        <button type="button" className="hud-sc mt-2 flex h-8 w-full items-center justify-center bg-[var(--enemy)] text-sm text-[var(--ink)]" onClick={view.onUnlock}>
          Увімкнути звук
        </button>
      )}
      {view.failed && (
        <p role="alert" className="mt-1 text-[var(--enemy)]">
          Трек недоступний
        </p>
      )}
      {children}
      {control && library && <DmAudioControls audio={audio} control={control} library={library} />}
    </section>
  );
}
