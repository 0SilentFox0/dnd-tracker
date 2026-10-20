"use client";

import { ChevronDown, ChevronRight, Search } from "lucide-react";

import { TrackList, type TrackListActions } from "./TrackList";

import { Input } from "@/components/ui/input";
import { usePlaylistView } from "@/lib/hooks/battle";
import { useTrackPreview } from "@/lib/hooks/music";
import type { CampaignTrack } from "@/types/audio";

export function TrackGroups({ tracks, busy, actions }: { tracks: CampaignTrack[]; busy: boolean; actions: TrackListActions }) {
  const view = usePlaylistView(tracks);

  const preview = useTrackPreview();

  const { data, set } = view.filter;

  const grouped = view.groupNames.length > 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-hud-muted" />
        <Input type="search" aria-label="Пошук треку" placeholder="Пошук…" value={data.query} onChange={(e) => set({ query: e.target.value })} className="pl-8" />
      </div>
      {view.shownCount === 0 && <p className="text-sm text-hud-muted">Нічого не знайдено</p>}
      {grouped ? (
        view.groups.map((g) => {
          const folded = view.collapsed.has(g.name);

          return (
            <section key={g.name} aria-label={g.name} className="flex flex-col gap-2">
              <button type="button" aria-expanded={!folded} onClick={() => view.collapsed.toggle(g.name)} className="flex items-center gap-1 text-left text-hud-gold hover:text-hud-gold-bright">
                {folded ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                <span className="hud-sc min-w-0 flex-1 truncate tracking-[.08em]">{g.name}</span>
                <span className="text-xs text-hud-muted">{g.tracks.length}</span>
              </button>
              {!folded && <TrackList tracks={g.tracks} busy={busy} actions={actions} preview={preview} />}
            </section>
          );
        })
      ) : (
        <TrackList tracks={view.groups.flatMap((g) => g.tracks)} busy={busy} actions={actions} preview={preview} />
      )}
    </div>
  );
}
