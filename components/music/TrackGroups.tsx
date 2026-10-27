"use client";

import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";

import { TrackList, type TrackListActions } from "./TrackList";

import { SearchInput } from "@/components/common/SearchInput";
import { Button } from "@/components/ui/button";
import { usePlaylistView } from "@/lib/hooks/audio";
import { useTrackPreview } from "@/lib/hooks/music";
import type { CampaignTrack } from "@/types/audio";

export function TrackGroups({ tracks, busy, actions }: { tracks: CampaignTrack[]; busy: boolean; actions: TrackListActions }) {
  const view = usePlaylistView(tracks);

  const preview = useTrackPreview();

  const { data, set } = view.filter;

  const grouped = view.groupNames.length > 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchInput value={data.query} onChange={(query) => set({ query })} label="Пошук треку" placeholder="Пошук…" className="min-w-0 flex-1" />
        {grouped && (
          <Button variant="outline" size="sm" disabled={!!data.query.trim()} onClick={view.collapsed.toggleAll} className="flex shrink-0 items-center gap-1.5">
            {view.collapsed.all ? <ChevronsUpDown className="size-4" /> : <ChevronsDownUp className="size-4" />}
            {view.collapsed.all ? "Розгорнути всі" : "Згорнути всі"}
          </Button>
        )}
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
