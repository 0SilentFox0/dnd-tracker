"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";

import { TrackTitleInput } from "@/components/music/TrackTitleInput";
import type { BattleAudioDm, BattleAudioValue } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { CampaignTrack } from "@/types/audio";

function TrackRow({ track, current, disabled, actions }: { track: CampaignTrack; current: boolean; disabled: boolean; actions: { play(): void; rename(title: string): void } }) {
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
          className={cn("min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left hover:bg-white/10", current && "bg-white/10 text-hud-gold-bright")}
        >
          {track.kind === "youtube" ? "▶ " : "♪ "}
          {track.title}
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

export function DmPlaylist({ dm, state, playlist }: { dm: BattleAudioDm; state: BattleAudioValue["state"]; playlist: BattleAudioValue["prefs"]["playlist"] }) {
  const { open, set } = playlist;

  const { control, library } = dm;

  return (
    <div className="mt-2">
      <button type="button" aria-expanded={open} onClick={() => set(!open)} className="flex w-full items-center gap-1 text-hud-muted hover:text-hud-bone">
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <span className="hud-sc tracking-[.08em]">Плейлист</span>
      </button>
      {open && (
        <ul aria-label="Плейлист" className="mt-1 max-h-48 overflow-y-auto">
          {library.tracks.map((t) => (
            <TrackRow
              key={t.id}
              track={t}
              current={t.id === state?.trackId}
              disabled={control.pending}
              actions={{ play: () => control.send({ action: "play", trackId: t.id }), rename: (title) => library.rename(t.id, title) }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
