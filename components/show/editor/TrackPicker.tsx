"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { useTracks } from "@/lib/hooks/music";
import { cn } from "@/lib/utils";
import { filterTracks, groupTracks } from "@/lib/utils/audio/playlist-groups";

const ROW = "w-full rounded px-2 py-1.5 text-left text-sm text-hud-bone hover:bg-white/10";

export function TrackPicker({ campaignId, value, onChange }: { campaignId: string; value: string | undefined; onChange(trackId: string | undefined): void }) {
  const { data: tracks = [] } = useTracks(campaignId);

  const [query, setQuery] = useState("");

  const groups = groupTracks(filterTracks(tracks, { query, group: null, kind: null }));

  return (
    <div className="space-y-2">
      <Input aria-label="Пошук треку" placeholder="Пошук треку" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="max-h-56 overflow-y-auto rounded border border-hud-rule p-1">
        <button type="button" aria-pressed={value === undefined} onClick={() => onChange(undefined)} className={cn(ROW, value === undefined && "bg-white/10 text-hud-gold")}>
          Без треку
        </button>
        {groups.map((group) => (
          <div key={group.name}>
            <p className="px-2 pt-2 text-xs uppercase text-hud-muted">{group.name}</p>
            {group.tracks.map((track) => (
              <button key={track.id} type="button" aria-pressed={value === track.id} onClick={() => onChange(track.id)} className={cn(ROW, value === track.id && "bg-white/10 text-hud-gold")}>
                {track.title}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
