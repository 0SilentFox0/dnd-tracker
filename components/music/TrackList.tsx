"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";

import { TrackTitleInput } from "./TrackTitleInput";

import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
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

function kindLabel(t: CampaignTrack) {
  if (t.kind === "youtube") return "YouTube";

  const format = trackFormatOfUrl(t.url)?.toUpperCase() ?? "Файл";

  const d = duration(t.durationSec);

  return d ? `${format} · ${d}` : format;
}

function TrackLink({ track }: { track: CampaignTrack }) {
  const href = trackLink(track);

  return href ? (
    <a href={href} target="_blank" rel="noreferrer noopener" className="block truncate text-xs text-hud-muted underline-offset-2 hover:text-hud-bone hover:underline">
      {href.replace(/^https?:\/\//, "")}
    </a>
  ) : null;
}

export function TrackList({ tracks, busy, actions }: { tracks: CampaignTrack[]; busy: boolean; actions: TrackListActions }) {
  return (
    <ol className="flex flex-col gap-2">
      {tracks.map((t, i) => (
        <li key={t.id}>
          <HudCard className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <TrackTitleInput key={t.title} track={t} onRename={(title) => actions.onRename(t.id, title)} className="flex-none" />
              <TrackLink track={t} />
            </div>
            <span className="w-24 shrink-0 text-xs text-hud-muted">{kindLabel(t)}</span>
            <Button variant="ghost" size="icon" aria-label="Вище" disabled={busy || i === 0} onClick={() => actions.onMove(t.id, -1)}>
              <ArrowUp className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Нижче" disabled={busy || i === tracks.length - 1} onClick={() => actions.onMove(t.id, 1)}>
              <ArrowDown className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Редагувати" onClick={() => actions.onEdit(t)}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Видалити" onClick={() => actions.onDelete(t)}>
              <Trash2 className="size-4" />
            </Button>
          </HudCard>
        </li>
      ))}
    </ol>
  );
}
