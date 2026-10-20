"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { TrackTitleInput } from "./TrackTitleInput";

import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { trackFormatOfUrl } from "@/lib/utils/audio/track-file";
import type { CampaignTrack } from "@/types/audio";

export interface TrackListActions {
  onRename(id: string, title: string): void;
  onDelete(track: CampaignTrack): void;
  onMove(index: number, dir: -1 | 1): void;
}

const duration = (sec: number | null) => (sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : null);

function kindLabel(t: CampaignTrack) {
  if (t.kind === "youtube") return "YouTube";

  const format = trackFormatOfUrl(t.url)?.toUpperCase() ?? "Файл";

  const d = duration(t.durationSec);

  return d ? `${format} · ${d}` : format;
}

export function TrackList({ tracks, busy, actions }: { tracks: CampaignTrack[]; busy: boolean; actions: TrackListActions }) {
  return (
    <ol className="flex flex-col gap-2">
      {tracks.map((t, i) => (
        <li key={t.id}>
          <HudCard className="flex items-center gap-2">
            <TrackTitleInput key={t.title} track={t} onRename={(title) => actions.onRename(t.id, title)} />
            <span className="w-24 shrink-0 text-xs text-hud-muted">{kindLabel(t)}</span>
            <Button variant="ghost" size="icon" aria-label="Вище" disabled={busy || i === 0} onClick={() => actions.onMove(i, -1)}>
              <ArrowUp className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Нижче" disabled={busy || i === tracks.length - 1} onClick={() => actions.onMove(i, 1)}>
              <ArrowDown className="size-4" />
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
