import { describe, expect, it } from "vitest";

import { audioPosition, loopDrift, planSync } from "../position";

const playing = { playing: true, offsetSec: 10, startedAt: 1_000 };

describe("audioPosition", () => {
  it("грає: offset + минулий час за годинником сервера", () => {
    expect(audioPosition(playing, { now: 6_000, clockOffsetMs: 0, durationSec: null })).toBe(15);
    expect(audioPosition(playing, { now: 5_000, clockOffsetMs: 1_000, durationSec: null })).toBe(15);
  });

  it("по колу: модуль тривалості", () => {
    expect(audioPosition({ playing: true, offsetSec: 170, startedAt: 0 }, { now: 20_000, clockOffsetMs: 0, durationSec: 180 })).toBe(10);
  });

  it("пауза: позиція не росте", () => {
    expect(audioPosition({ ...playing, playing: false }, { now: 999_000, clockOffsetMs: 0, durationSec: 180 })).toBe(10);
  });

  it("startedAt у майбутньому (розбіжність годинників) — не відʼємна позиція", () => {
    expect(audioPosition(playing, { now: 0, clockOffsetMs: 0, durationSec: null })).toBe(10);
  });
});

describe("loopDrift", () => {
  it("по колу: 1 с і 179 с трека 180 с — 2 с, не 178", () => {
    expect(loopDrift(1, 179, 180)).toBe(2);
    expect(loopDrift(179.5, 0.5, 180)).toBe(1);
  });

  it("без тривалості — пряма різниця", () => {
    expect(loopDrift(1, 179, null)).toBe(178);
  });
});

describe("planSync", () => {
  it("дрейф ≤ 1,5 с — не чіпати; більше — перемотати", () => {
    expect(planSync({ shouldPlay: true, paused: false, current: 10, target: 11.4, durationSec: 180 })).toEqual({ seekTo: null, play: false, pause: false });
    expect(planSync({ shouldPlay: true, paused: false, current: 10, target: 12, durationSec: 180 })).toEqual({ seekTo: 12, play: false, pause: false });
  });

  it("має грати, а стоїть — play; не має — pause лише якщо грає", () => {
    expect(planSync({ shouldPlay: true, paused: true, current: 0, target: 0, durationSec: null }).play).toBe(true);
    expect(planSync({ shouldPlay: false, paused: false, current: 5, target: 50, durationSec: null })).toEqual({ seekTo: null, play: false, pause: true });
    expect(planSync({ shouldPlay: false, paused: true, current: 5, target: 50, durationSec: null })).toEqual({ seekTo: null, play: false, pause: false });
  });
});
