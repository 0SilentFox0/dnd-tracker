"use client";

import { useMemo, useState } from "react";

import { filterTracks, groupTracks, listTrackGroups, type PlaylistFilter, type TrackGroup } from "@/lib/utils/audio/playlist-groups";
import type { CampaignTrack } from "@/types/audio";

export interface PlaylistView {
  filter: { data: PlaylistFilter; set(patch: Partial<PlaylistFilter>): void; active: boolean; reset(): void };
  groupNames: string[];
  groups: TrackGroup<CampaignTrack>[];
  shownCount: number;
  collapsed: { has(name: string): boolean; toggle(name: string): void };
}

const NO_FILTER: PlaylistFilter = { query: "", group: null, kind: null };

export function usePlaylistView(tracks: CampaignTrack[]): PlaylistView {
  const [filter, setFilter] = useState<PlaylistFilter>(NO_FILTER);

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());

  const groupNames = useMemo(() => listTrackGroups(tracks), [tracks]);

  // група могла зникнути після перейменування — тоді фільтр по ній не діє
  const effective = useMemo(() => (filter.group && !groupNames.includes(filter.group) ? { ...filter, group: null } : filter), [filter, groupNames]);

  const shown = useMemo(() => filterTracks(tracks, effective), [tracks, effective]);

  const groups = useMemo(() => groupTracks(shown), [shown]);

  const active = !!(effective.query.trim() || effective.group || effective.kind);

  return {
    filter: { data: effective, set: (patch) => setFilter((f) => ({ ...f, ...patch })), active, reset: () => setFilter(NO_FILTER) },
    groupNames,
    groups,
    shownCount: shown.length,
    collapsed: {
      // під час пошуку все розгорнуто, щоб збіги не ховались у згорнутих групах
      has: (name) => !effective.query.trim() && collapsed.has(name),
      toggle: (name) =>
        setCollapsed((s) => {
          const next = new Set(s);

          if (!next.delete(name)) next.add(name);

          return next;
        }),
    },
  };
}
