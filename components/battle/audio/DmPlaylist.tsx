"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Search, X } from "lucide-react";

import { TrackTitleInput } from "@/components/music/TrackTitleInput";
import { type BattleAudioDm, type PlaylistView, useBattleAudio, usePlaylistView } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { trackLabelInGroup } from "@/lib/utils/audio/playlist-groups";
import type { CampaignTrack, TrackKind } from "@/types/audio";

function TrackRow({ track, label, current, disabled, actions }: { track: CampaignTrack; label: string; current: boolean; disabled: boolean; actions: { play(): void; rename(title: string): void } }) {
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
        <button type="button" aria-label={`Перейменувати: ${track.title}`} title="Перейменувати" onClick={() => setEditing(true)} className="flex size-7 shrink-0 items-center justify-center text-hud-muted hover:text-hud-bone">
          <Pencil className="size-3.5" />
        </button>
      )}
    </li>
  );
}

const FIELD = "h-7 min-w-0 rounded border border-hud-rule bg-black/60 px-1.5 text-xs text-hud-bone";

const KIND_LABELS: Record<TrackKind, string> = { youtube: "YouTube", file: "Файли" };

function PlaylistFilters({ view, total }: { view: PlaylistView; total: number }) {
  const { data, set, active, reset } = view.filter;

  return (
    <div className="mt-1 space-y-1">
      <div className="relative flex items-center">
        <Search aria-hidden className="pointer-events-none absolute left-1.5 size-3.5 text-hud-muted" />
        <input type="search" aria-label="Пошук треку" placeholder="Пошук…" value={data.query} onChange={(e) => set({ query: e.target.value })} className={cn(FIELD, "w-full pl-6")} />
      </div>
      <div className="flex items-center gap-1">
        {view.groupNames.length > 1 && (
          <select aria-label="Група" value={data.group ?? ""} onChange={(e) => set({ group: e.target.value || null })} className={cn(FIELD, "flex-1")}>
            <option value="">Усі групи</option>
            {view.groupNames.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
        <select aria-label="Тип треку" value={data.kind ?? ""} onChange={(e) => set({ kind: (e.target.value || null) as TrackKind | null })} className={cn(FIELD, "flex-1")}>
          <option value="">Усі типи</option>
          {(Object.keys(KIND_LABELS) as TrackKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
        {active && (
          <button type="button" aria-label="Скинути фільтри" title="Скинути фільтри" onClick={reset} className="flex size-7 shrink-0 items-center justify-center text-hud-muted hover:text-hud-bone">
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {active && (
        <p className="text-hud-muted">
          Знайдено {view.shownCount} з {total}
        </p>
      )}
    </div>
  );
}

export function DmPlaylist({ dm }: { dm: BattleAudioDm }) {
  const { state, prefs } = useBattleAudio();

  const { open, set } = prefs.playlist;

  const { control, library } = dm;

  const view = usePlaylistView(library.tracks);

  const grouped = view.groupNames.length > 1;

  const row = (t: CampaignTrack) => (
    <TrackRow
      key={t.id}
      track={t}
      label={grouped ? trackLabelInGroup(t.title) : t.title}
      current={t.id === state?.trackId}
      disabled={control.pending}
      actions={{ play: () => control.send({ action: "play", trackId: t.id }), rename: (title) => library.rename(t.id, title) }}
    />
  );

  return (
    <div className="mt-2">
      <button type="button" aria-expanded={open} onClick={() => set(!open)} className="flex w-full items-center gap-1 text-hud-muted hover:text-hud-bone">
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <span className="hud-sc tracking-[.08em]">Плейлист</span>
      </button>
      {open && (
        <>
          <PlaylistFilters view={view} total={library.tracks.length} />
          {view.shownCount === 0 && <p className="mt-1 text-hud-muted">Нічого не знайдено</p>}
          <ul aria-label="Плейлист" className="mt-1 max-h-64 overflow-y-auto">
            {grouped
              ? view.groups.map((g) => {
                  const folded = view.collapsed.has(g.name);

                  return (
                    <li key={g.name}>
                      <button
                        type="button"
                        aria-expanded={!folded}
                        onClick={() => view.collapsed.toggle(g.name)}
                        className="sticky top-0 z-[1] flex w-full items-center gap-1 bg-black/90 px-1 py-0.5 text-left text-hud-gold hover:text-hud-gold-bright"
                      >
                        {folded ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                        <span className="min-w-0 flex-1 truncate">{g.name}</span>
                        <span className="text-hud-muted">{g.tracks.length}</span>
                      </button>
                      {!folded && <ul aria-label={g.name}>{g.tracks.map(row)}</ul>}
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
