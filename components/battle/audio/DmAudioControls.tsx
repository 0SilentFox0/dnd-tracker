"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";

import { DmPlaylist } from "./DmPlaylist";

import type { BattleAudioValue } from "@/lib/hooks/battle";
import { useBattleScene } from "@/lib/hooks/battle";

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="flex size-8 items-center justify-center rounded border border-hud-rule hover:bg-white/10 disabled:opacity-40">
      {children}
    </button>
  );
}

export function DmAudioControls({ audio, control, library }: { audio: Pick<BattleAudioValue, "state" | "prefs">; control: NonNullable<BattleAudioValue["control"]>; library: NonNullable<BattleAudioValue["library"]> }) {
  const { state } = audio;

  const { campaignId } = useBattleScene();

  const { send, pending } = control;

  const hasTrack = !!state?.trackId;

  const playing = !!state?.playing;

  const empty = library.tracks.length === 0;

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
        <DmPlaylist state={state} playlist={audio.prefs.playlist} control={control} library={library} />
      )}
    </div>
  );
}
