"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Pencil, Search, X } from "lucide-react";

import { TrackTitleInput } from "@/components/music/TrackTitleInput";
import { type PlayerAudioDm, type PlaylistView, usePlayerAudio, usePlaylistView } from "@/lib/hooks/audio";
import { cn } from "@/lib/utils";
import { trackGroupLabelKey, trackLabelInGroup } from "@/lib/utils/audio/playlist-groups";
import type { CampaignTrack, TrackKind } from "@/types/audio";

function TrackRow({ track, label, current, disabled, actions }: { track: CampaignTrack; label: string; current: boolean; disabled: boolean; actions: { play(): void; rename(title: string): void } }) {
  const t = useTranslations("music");

  const [editing, setEditing] = useState(false);

  return (
    <li className="flex items-center gap-1">
      {editing ? (
        <TrackTitleInput track={track} onRename={actions.rename} onClose={() => setEditing(false)} className="h-auto rounded border-hud-rule bg-black/60 px-1.5 py-1 text-xs text-hud-bone md:text-xs" />
      ) : (
        <button
          type="button"
          aria-current={current || undefined}
          disabled={disabled}
          onClick={actions.play}
          title={track.title}
          className={cn("min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left hover:bg-white/10", current && "bg-white/10 text-hud-gold-bright")}
        >
          {track.kind === "youtube" ? "▶ " : "♪ "}
          {label}
        </button>
      )}
      {!editing && (
        <button type="button" aria-label={t("playlist.renameLabel", { title: track.title })} title={t("playlist.rename")} onClick={() => setEditing(true)} className="flex size-7 shrink-0 items-center justify-center text-hud-muted hover:text-hud-bone">
          <Pencil className="size-3.5" />
        </button>
      )}
    </li>
  );
}

const FIELD = "h-7 min-w-0 rounded border border-hud-rule bg-black/60 px-1.5 text-xs text-hud-bone";

const KINDS: TrackKind[] = ["youtube", "file"];

function PlaylistFilters({ view, total }: { view: PlaylistView; total: number }) {
  const t = useTranslations();

  const { data, set, active, reset } = view.filter;

  return (
    <div className="mt-1 space-y-1">
      <div className="relative flex items-center">
        <Search aria-hidden className="pointer-events-none absolute left-1.5 size-3.5 text-hud-muted" />
        <input type="search" aria-label={t("music.search.label")} placeholder={t("music.search.placeholder")} value={data.query} onChange={(e) => set({ query: e.target.value })} className={cn(FIELD, "w-full pl-6")} />
      </div>
      <div className="flex items-center gap-1">
        {view.groupNames.length > 1 && (
          <select aria-label={t("music.playlist.group")} value={data.group ?? ""} onChange={(e) => set({ group: e.target.value || null })} className={cn(FIELD, "flex-1")}>
            <option value="">{t("music.playlist.allGroups")}</option>
            {view.groupNames.map((g) => {
              const key = trackGroupLabelKey(g);

              return (
                <option key={g} value={g}>
                  {key ? t(key) : g}
                </option>
              );
            })}
          </select>
        )}
        <select aria-label={t("music.playlist.kind")} value={data.kind ?? ""} onChange={(e) => set({ kind: (e.target.value || null) as TrackKind | null })} className={cn(FIELD, "flex-1")}>
          <option value="">{t("music.playlist.allKinds")}</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`music.playlist.kinds.${k}`)}
            </option>
          ))}
        </select>
        {active && (
          <button type="button" aria-label={t("music.playlist.resetFilters")} title={t("music.playlist.resetFilters")} onClick={reset} className="flex size-7 shrink-0 items-center justify-center text-hud-muted hover:text-hud-bone">
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {active && (
        <p className="text-hud-muted">
          {t("music.playlist.found", { shown: view.shownCount, total })}
        </p>
      )}
    </div>
  );
}

export function DmPlaylist({ dm }: { dm: PlayerAudioDm }) {
  const t = useTranslations();

  const { state, prefs } = usePlayerAudio();

  const { open, set } = prefs.playlist;

  const { control, library } = dm;

  const view = usePlaylistView(library.tracks);

  const grouped = view.groupNames.length > 1;

  const row = (tr: CampaignTrack) => (
    <TrackRow
      key={tr.id}
      track={tr}
      label={grouped ? trackLabelInGroup(tr.title) : tr.title}
      current={tr.id === state?.trackId}
      disabled={control.pending}
      actions={{ play: () => control.send({ action: "play", trackId: tr.id }), rename: (title) => library.rename(tr.id, title) }}
    />
  );

  return (
    <div className="mt-2">
      <button type="button" aria-expanded={open} onClick={() => set(!open)} className="flex w-full items-center gap-1 text-hud-muted hover:text-hud-bone">
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <span className="hud-sc tracking-[.08em]">{t("music.playlist.title")}</span>
      </button>
      {open && (
        <>
          <PlaylistFilters view={view} total={library.tracks.length} />
          {view.shownCount === 0 && <p className="mt-1 text-hud-muted">{t("music.list.nothingFound")}</p>}
          <ul aria-label={t("music.playlist.title")} className="mt-1 max-h-64 overflow-y-auto">
            {grouped
              ? view.groups.map((g) => {
                  const folded = view.collapsed.has(g.name);

                  const groupKey = trackGroupLabelKey(g.name);

                  const groupLabel = groupKey ? t(groupKey) : g.name;

                  return (
                    <li key={g.name}>
                      <button
                        type="button"
                        aria-expanded={!folded}
                        onClick={() => view.collapsed.toggle(g.name)}
                        className="sticky top-0 z-[1] flex w-full items-center gap-1 bg-black/90 px-1 py-0.5 text-left text-hud-gold hover:text-hud-gold-bright"
                      >
                        {folded ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                        <span className="min-w-0 flex-1 truncate">{groupLabel}</span>
                        <span className="text-hud-muted">{g.tracks.length}</span>
                      </button>
                      {!folded && <ul aria-label={groupLabel}>{g.tracks.map(row)}</ul>}
                    </li>
                  );
                })
              : view.groups.flatMap((g) => g.tracks).map(row)}
          </ul>
        </>
      )}
    </div>
  );
}
