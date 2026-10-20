import { describe, expect, it } from "vitest";

import { applyAudioCommand, type AudioLibraryEntry, commandNeedsLibrary } from "../audio-command";

import { API_ERRORS } from "@/lib/constants/api-errors";
import type { BattleAudioCommand, BattleAudioState } from "@/types/audio";

const entry = (id: string, durationSec: number | null = 100): AudioLibraryEntry => ({ id, track: { title: id, kind: "file", url: `https://s/${id}.mp3`, youtubeId: null, durationSec } });

const library = [entry("a"), entry("b"), entry("c")];

const ctx = { now: 50_000, library };

const playingA: BattleAudioState = { trackId: "a", track: library[0].track, playing: true, offsetSec: 0, startedAt: 10_000, seq: 4 };

const apply = (prev: BattleAudioState | null, cmd: BattleAudioCommand, c: typeof ctx = ctx): BattleAudioState => {
  const r = applyAudioCommand(prev, cmd, c);

  if (!r.ok) throw new Error(r.message);

  return r.value;
};

describe("applyAudioCommand", () => {
  it("play: трек з бібліотеки з нуля, seq+1; чужий id — помилка", () => {
    expect(apply(null, { action: "play", trackId: "b" }, ctx)).toEqual({ trackId: "b", track: library[1].track, playing: true, offsetSec: 0, startedAt: 50_000, seq: 1 });
    expect(applyAudioCommand(null, { action: "play", trackId: "x" }, ctx)).toEqual({ ok: false, message: API_ERRORS.TRACK_NOT_FOUND });
  });

  it("pause фіксує позицію по колу; resume продовжує з неї", () => {
    const paused = apply(playingA, { action: "pause" }, ctx);

    expect(paused).toMatchObject({ playing: false, offsetSec: 40, startedAt: 50_000, seq: 5 });

    const later = apply({ ...playingA, startedAt: 0 }, { action: "pause" }, { ...ctx, now: 250_000 });

    expect(later.offsetSec).toBe(50);

    expect(apply(paused, { action: "resume" }, { ...ctx, now: 70_000 })).toMatchObject({ playing: true, offsetSec: 40, startedAt: 70_000, seq: 6 });
  });

  it("pause/resume без треку — помилка; повторна pause — лише seq", () => {
    expect(applyAudioCommand(null, { action: "pause" }, ctx)).toEqual({ ok: false, message: API_ERRORS.BATTLE_AUDIO_NO_TRACK });
    expect(applyAudioCommand(null, { action: "resume" }, ctx)).toEqual({ ok: false, message: API_ERRORS.BATTLE_AUDIO_NO_TRACK });

    const paused = { ...playingA, playing: false, offsetSec: 7 };

    expect(apply(paused, { action: "pause" }, ctx)).toEqual({ ...paused, seq: 5 });
  });

  it("next/prev ходять по колу бібліотеки; без поточного — перший/останній; порожня — помилка", () => {
    expect(apply(playingA, { action: "next" }, ctx)).toMatchObject({ trackId: "b", offsetSec: 0, playing: true });
    expect(apply(playingA, { action: "prev" }, ctx)).toMatchObject({ trackId: "c" });
    expect(apply({ ...playingA, trackId: "c" }, { action: "next" }, ctx)).toMatchObject({ trackId: "a" });
    expect(apply(null, { action: "next" }, ctx)).toMatchObject({ trackId: "a" });
    expect(apply(null, { action: "prev" }, ctx)).toMatchObject({ trackId: "c" });
    expect(applyAudioCommand(playingA, { action: "next" }, { ...ctx, library: [] })).toEqual({ ok: false, message: API_ERRORS.BATTLE_AUDIO_EMPTY_LIBRARY });
  });

  it("stop: без треку, на паузі, seq+1", () => {
    expect(apply(playingA, { action: "stop" }, ctx)).toEqual({ trackId: null, track: null, playing: false, offsetSec: 0, startedAt: 50_000, seq: 5 });
  });

  it("бібліотеку читаємо лише для play/next/prev", () => {
    expect(["play", "next", "prev", "pause", "resume", "stop"].map((action) => commandNeedsLibrary({ action, trackId: "a" } as never))).toEqual([true, true, true, false, false, false]);
  });
});
