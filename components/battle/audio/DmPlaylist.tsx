"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";

import { TRACK_TITLE_MAX } from "@/lib/constants/music";
import type { BattleAudioValue } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { CampaignTrack } from "@/types/audio";

type Library = NonNullable<BattleAudioValue["library"]>;

function TitleEditor({ track, onDone }: { track: CampaignTrack; onDone(title: string | null): void }) {
  // Esc знімає поле з фокусу, і blur не мусить зберегти скасовану назву
  const settled = useRef(false);

  const finish = (title: string | null) => {
    if (settled.current) return;

    settled.current = true;
    onDone(title);
  };

  return (
    <input
      aria-label="Нова назва треку"
      autoFocus
      defaultValue={track.title}
      maxLength={TRACK_TITLE_MAX}
      onBlur={(e) => finish(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(e.currentTarget.value);

        if (e.key === "Escape") finish(null);
      }}
      className="min-w-0 flex-1 rounded border border-hud-rule bg-black/60 px-1.5 py-1 text-hud-bone"
    />
  );
}

function TrackRow({ track, current, disabled, actions }: { track: CampaignTrack; current: boolean; disabled: boolean; actions: { play(): void; rename(title: string): void } }) {
  const [editing, setEditing] = useState(false);

  const done = (raw: string | null) => {
    setEditing(false);

    const title = raw?.trim();

    if (title && title !== track.title) actions.rename(title);
  };

  return (
    <li className="flex items-center gap-1">
      {editing ? (
        <TitleEditor track={track} onDone={done} />
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

export function DmPlaylist({ state, playlist, control, library }: { state: BattleAudioValue["state"]; playlist: BattleAudioValue["prefs"]["playlist"]; control: NonNullable<BattleAudioValue["control"]>; library: Library }) {
  const { open, set } = playlist;

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
