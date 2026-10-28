"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Pause, Pencil, Play, Trash2 } from "lucide-react";

import { TrackTitleInput } from "./TrackTitleInput";

import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import type { TrackPreview } from "@/lib/hooks/music";
import { trackFormatOfUrl } from "@/lib/utils/audio/track-file";
import { trackLink } from "@/lib/utils/audio/track-link";
import type { CampaignTrack } from "@/types/audio";

export interface TrackListActions {
  onRename(id: string, title: string): void;
  onEdit(track: CampaignTrack): void;
  onDelete(track: CampaignTrack): void;
  onMove(id: string, dir: -1 | 1): void;
}

const duration = (sec: number | null) => (sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : null);

function kindLabel(track: CampaignTrack, fileLabel: string) {
  if (track.kind === "youtube") return "YouTube";

  return trackFormatOfUrl(track.url)?.toUpperCase() ?? fileLabel;
}

function TrackLink({ track }: { track: CampaignTrack }) {
  const href = trackLink(track);

  return href ? (
    <a href={href} target="_blank" rel="noreferrer noopener" className="block truncate text-xs text-hud-muted underline-offset-2 hover:text-hud-bone hover:underline">
      {href.replace(/^https?:\/\//, "")}
    </a>
  ) : null;
}

export function TrackList({ tracks, busy, actions, preview }: { tracks: CampaignTrack[]; busy: boolean; actions: TrackListActions; preview: TrackPreview }) {
  const t = useTranslations();

  return (
    <ol className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {tracks.map((track, i) => {
        const playing = preview.playingId === track.id;

        const failed = preview.failedId === track.id;

        const time = duration(track.durationSec);

        return (
          <li key={track.id} className="min-w-0">
            <HudCard tone={playing ? "active" : "default"} className="flex h-full flex-col gap-1.5 p-2.5">
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" aria-label={playing ? t("music.list.pause") : t("music.list.play")} aria-pressed={playing} className="shrink-0" onClick={() => preview.toggle(track)}>
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </Button>
                <TrackTitleInput key={track.title} track={track} onRename={(title) => actions.onRename(track.id, title)} className="flex-1" />
              </div>
              <TrackLink track={track} />
              <div className="flex items-center gap-2 text-xs text-hud-muted">
                <span className="rounded bg-white/5 px-1.5 py-0.5">{kindLabel(track, t("music.list.fileKind"))}</span>
                {time && <span>{time}</span>}
                {failed && <span role="alert" className="text-[var(--enemy)]">{t("music.list.playFailed")}</span>}
              </div>
              {playing && preview.progress !== null && (
                <div role="progressbar" aria-label={t("music.list.progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(preview.progress * 100)} className="h-1 overflow-hidden rounded bg-white/10">
                  <div className="h-full bg-hud-gold" style={{ width: `${preview.progress * 100}%` }} />
                </div>
              )}
              <div className="mt-auto flex items-center justify-end gap-0.5">
                <Button variant="ghost" size="icon" aria-label={t("music.list.earlier")} disabled={busy || i === 0} onClick={() => actions.onMove(track.id, -1)}>
                  <ArrowLeft className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={t("music.list.later")} disabled={busy || i === tracks.length - 1} onClick={() => actions.onMove(track.id, 1)}>
                  <ArrowRight className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={t("common.actions.edit")} onClick={() => actions.onEdit(track)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={t("common.actions.delete")} onClick={() => actions.onDelete(track)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </HudCard>
          </li>
        );
      })}
    </ol>
  );
}
