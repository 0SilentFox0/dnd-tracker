"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";

import type { BattleAudioValue } from "@/lib/hooks/battle";
import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="flex size-8 items-center justify-center rounded border border-hud-rule hover:bg-white/10 disabled:opacity-40">
      {children}
    </button>
  );
}

export function DmAudioControls({ state, control, library }: { state: BattleAudioValue["state"]; control: NonNullable<BattleAudioValue["control"]>; library: NonNullable<BattleAudioValue["library"]> }) {
  const { campaignId } = useBattleScene();

  const { send, pending } = control;

  const hasTrack = !!state?.trackId;

  const playing = !!state?.playing;

  const empty = library.tracks.length === 0;

  // поточний трек на паузі продовжується з місця паузи: play почав би з нуля
  const pick = (trackId: string) => send(trackId === state?.trackId && !playing ? { action: "resume" } : { action: "play", trackId });

  return (
    <div className="mt-2 border-t border-hud-rule pt-2">
      <div className="flex justify-center gap-1">
        <IconButton label="Попередній трек" onClick={() => send({ action: "prev" })} disabled={pending || empty}>
          <SkipBack className="size-4" />
        </IconButton>
        <IconButton
          label={playing ? "Пауза" : "Грати"}
          onClick={() => send(playing ? { action: "pause" } : hasTrack ? { action: "resume" } : { action: "next" })}
          disabled={pending || (!hasTrack && empty)}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </IconButton>
        <IconButton label="Наступний трек" onClick={() => send({ action: "next" })} disabled={pending || empty}>
          <SkipForward className="size-4" />
        </IconButton>
        <IconButton label="Стоп" onClick={() => send({ action: "stop" })} disabled={pending || !hasTrack}>
          <Square className="size-4" />
        </IconButton>
      </div>
      {empty && !library.loading ? (
        <p className="mt-2 text-hud-muted">
          Бібліотека порожня — <Link href={`/campaigns/${campaignId}/dm/music`} className="underline">додайте треки</Link>.
        </p>
      ) : (
        <ul aria-label="Бібліотека музики" className="mt-2 max-h-40 overflow-y-auto">
          {library.tracks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                aria-current={t.id === state?.trackId || undefined}
                disabled={pending}
                onClick={() => pick(t.id)}
                className={cn("w-full truncate rounded px-1.5 py-1 text-left hover:bg-white/10", t.id === state?.trackId && "text-hud-gold-bright")}
              >
                {t.kind === "youtube" ? "▶ " : "♪ "}
                {t.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
