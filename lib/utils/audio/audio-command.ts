import { API_ERRORS } from "@/lib/constants/api-errors";
import { audioPosition } from "@/lib/utils/audio/position";
import type { BattleAudioCommand, BattleAudioState, BattleAudioTrack } from "@/types/audio";
import type { Result } from "@/types/common";

export interface AudioLibraryEntry {
  id: string;
  track: BattleAudioTrack;
}

interface Ctx {
  now: number;
  library: AudioLibraryEntry[];
  seq: number;
}

type Outcome = Result<BattleAudioState>;

const fail = (message: string): Outcome => ({ ok: false, message });

const done = (value: BattleAudioState): Outcome => ({ ok: true, value });

export const commandNeedsLibrary = (cmd: BattleAudioCommand) => cmd.action === "play" || cmd.action === "next" || cmd.action === "prev";

const start = (entry: AudioLibraryEntry, ctx: Ctx): Outcome => done({ trackId: entry.id, track: entry.track, playing: true, offsetSec: 0, startedAt: ctx.now, seq: ctx.seq });

function step(prev: BattleAudioState | null, ctx: Ctx, dir: 1 | -1): Outcome {
  const n = ctx.library.length;

  if (n === 0) return fail(API_ERRORS.BATTLE_AUDIO_EMPTY_LIBRARY);

  const at = ctx.library.findIndex((e) => e.id === prev?.trackId);

  const index = at === -1 ? (dir === 1 ? 0 : n - 1) : (at + dir + n) % n;

  return start(ctx.library[index], ctx);
}

type Handlers = { [A in BattleAudioCommand["action"]]: (prev: BattleAudioState | null, cmd: Extract<BattleAudioCommand, { action: A }>, ctx: Ctx) => Outcome };

const handlers: Handlers = {
  play: (_prev, cmd, ctx) => {
    const entry = ctx.library.find((e) => e.id === cmd.trackId);

    return entry ? start(entry, ctx) : fail(API_ERRORS.TRACK_NOT_FOUND);
  },
  pause: (prev, _cmd, ctx) => {
    if (!prev?.trackId) return fail(API_ERRORS.BATTLE_AUDIO_NO_TRACK);

    if (!prev.playing) return done({ ...prev, seq: ctx.seq });

    return done({ ...prev, playing: false, offsetSec: audioPosition(prev, { now: ctx.now, clockOffsetMs: 0, durationSec: prev.track?.durationSec ?? null }), startedAt: ctx.now, seq: ctx.seq });
  },
  resume: (prev, _cmd, ctx) => {
    if (!prev?.trackId) return fail(API_ERRORS.BATTLE_AUDIO_NO_TRACK);

    return done(prev.playing ? { ...prev, seq: ctx.seq } : { ...prev, playing: true, startedAt: ctx.now, seq: ctx.seq });
  },
  next: (prev, _cmd, ctx) => step(prev, ctx, 1),
  prev: (prev, _cmd, ctx) => step(prev, ctx, -1),
  stop: (_prev, _cmd, ctx) => done({ trackId: null, track: null, playing: false, offsetSec: 0, startedAt: ctx.now, seq: ctx.seq }),
};

export function applyAudioCommand(prev: BattleAudioState | null, cmd: BattleAudioCommand, ctx: { now: number; library: AudioLibraryEntry[] }): Outcome {
  const run = handlers[cmd.action] as (p: BattleAudioState | null, c: BattleAudioCommand, x: Ctx) => Outcome;

  return run(prev, cmd, { ...ctx, seq: (prev?.seq ?? 0) + 1 });
}
