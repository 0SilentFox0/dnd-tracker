import { API_ERRORS } from "@/lib/constants/api-errors";
import type { BattleAudioCommand, BattleAudioState, BattleAudioTrack } from "@/types/audio";

export interface AudioLibraryEntry {
  id: string;
  track: BattleAudioTrack;
}

interface Ctx {
  now: number;
  library: AudioLibraryEntry[];
  seq: number;
}

type Result = BattleAudioState | { error: string };

export const commandNeedsLibrary = (cmd: BattleAudioCommand) => cmd.action === "play" || cmd.action === "next" || cmd.action === "prev";

function positionAt(prev: BattleAudioState, now: number): number {
  const raw = prev.offsetSec + Math.max(0, now - prev.startedAt) / 1000;

  const duration = prev.track?.durationSec;

  return duration ? raw % duration : raw;
}

const start = (entry: AudioLibraryEntry, ctx: Ctx): BattleAudioState => ({ trackId: entry.id, track: entry.track, playing: true, offsetSec: 0, startedAt: ctx.now, seq: ctx.seq });

function step(prev: BattleAudioState | null, ctx: Ctx, dir: 1 | -1): Result {
  const n = ctx.library.length;

  if (n === 0) return { error: API_ERRORS.BATTLE_AUDIO_EMPTY_LIBRARY };

  const at = ctx.library.findIndex((e) => e.id === prev?.trackId);

  const index = at === -1 ? (dir === 1 ? 0 : n - 1) : (at + dir + n) % n;

  return start(ctx.library[index], ctx);
}

type Handlers = { [A in BattleAudioCommand["action"]]: (prev: BattleAudioState | null, cmd: Extract<BattleAudioCommand, { action: A }>, ctx: Ctx) => Result };

const handlers: Handlers = {
  play: (_prev, cmd, ctx) => {
    const entry = ctx.library.find((e) => e.id === cmd.trackId);

    return entry ? start(entry, ctx) : { error: API_ERRORS.TRACK_NOT_FOUND };
  },
  pause: (prev, _cmd, ctx) => {
    if (!prev?.trackId) return { error: API_ERRORS.BATTLE_AUDIO_NO_TRACK };

    return prev.playing ? { ...prev, playing: false, offsetSec: positionAt(prev, ctx.now), startedAt: ctx.now, seq: ctx.seq } : { ...prev, seq: ctx.seq };
  },
  resume: (prev, _cmd, ctx) => {
    if (!prev?.trackId) return { error: API_ERRORS.BATTLE_AUDIO_NO_TRACK };

    return prev.playing ? { ...prev, seq: ctx.seq } : { ...prev, playing: true, startedAt: ctx.now, seq: ctx.seq };
  },
  next: (prev, _cmd, ctx) => step(prev, ctx, 1),
  prev: (prev, _cmd, ctx) => step(prev, ctx, -1),
  stop: (_prev, _cmd, ctx) => ({ trackId: null, track: null, playing: false, offsetSec: 0, startedAt: ctx.now, seq: ctx.seq }),
};

export function applyAudioCommand(prev: BattleAudioState | null, cmd: BattleAudioCommand, ctx: { now: number; library: AudioLibraryEntry[] }): Result {
  const run = handlers[cmd.action] as (p: BattleAudioState | null, c: BattleAudioCommand, x: Ctx) => Result;

  return run(prev, cmd, { ...ctx, seq: (prev?.seq ?? 0) + 1 });
}
