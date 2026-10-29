"use client";

import { type ReactNode, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { useTracks } from "@/lib/hooks/music";
import { cn } from "@/lib/utils";
import { filterTracks, groupTracks } from "@/lib/utils/audio/playlist-groups";

function Row({ selected, onClick, children }: { selected: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={cn("w-full rounded px-2 py-1.5 text-left text-sm text-hud-bone hover:bg-white/10", selected && "bg-white/10 text-hud-gold")}>
      {children}
    </button>
  );
}

export function TrackPicker({ campaignId, value, onChange }: { campaignId: string; value: string | undefined; onChange(trackId: string | undefined): void }) {
  const t = useTranslations("show");

  const { data: tracks = [] } = useTracks(campaignId);

  const [query, setQuery] = useState("");

  const groups = groupTracks(filterTracks(tracks, { query, group: null, kind: null }));

  return (
    <div className="space-y-2">
      <Input aria-label={t("trackPicker.search")} placeholder={t("trackPicker.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="max-h-56 overflow-y-auto rounded border border-hud-rule p-1">
        <Row selected={value === undefined} onClick={() => onChange(undefined)}>
          {t("trackPicker.none")}
        </Row>
        {groups.map((group) => (
          <div key={group.name}>
            <p className="px-2 pt-2 text-xs uppercase text-hud-muted">{group.name}</p>
            {group.tracks.map((track) => (
              <Row key={track.id} selected={value === track.id} onClick={() => onChange(track.id)}>
                {track.title}
              </Row>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
