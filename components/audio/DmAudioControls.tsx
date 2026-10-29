"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";

import { DmPlaylist } from "./DmPlaylist";

import { type PlayerAudioDm, usePlayerAudio } from "@/lib/hooks/audio";

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="flex size-8 items-center justify-center rounded border border-hud-rule hover:bg-white/10 disabled:opacity-40">
      {children}
    </button>
  );
}

export function DmAudioControls({ dm }: { dm: PlayerAudioDm }) {
  const t = useTranslations("music");

  const { state } = usePlayerAudio();

  const { control, library } = dm;

  const { send, pending } = control;

  const hasTrack = !!state?.trackId;

  const playing = !!state?.playing;

  const empty = library.tracks.length === 0;

  return (
    <div className="mt-2 border-t border-hud-rule pt-2">
      <div className="flex justify-center gap-1">
        <IconButton label={t("dm.prev")} onClick={() => send({ action: "prev" })} disabled={pending || empty}>
          <SkipBack className="size-4" />
        </IconButton>
        <IconButton
          label={playing ? t("dm.pause") : t("dm.play")}
          onClick={() => send(playing ? { action: "pause" } : hasTrack ? { action: "resume" } : { action: "next" })}
          disabled={pending || (!hasTrack && empty)}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </IconButton>
        <IconButton label={t("dm.next")} onClick={() => send({ action: "next" })} disabled={pending || empty}>
          <SkipForward className="size-4" />
        </IconButton>
        <IconButton label={t("dm.stop")} onClick={() => send({ action: "stop" })} disabled={pending || !hasTrack}>
          <Square className="size-4" />
        </IconButton>
      </div>
      {empty && !library.isLoading ? (
        <p className="mt-2 text-hud-muted">
          {t.rich("dm.emptyLibrary", { link: (chunks) => <Link href={dm.musicHref} className="underline">{chunks}</Link> })}
        </p>
      ) : (
        <DmPlaylist dm={dm} />
      )}
    </div>
  );
}
