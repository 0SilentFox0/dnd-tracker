import { describe, expect, it } from "vitest";

import { mergeAudio } from "../merge";

import type { BattleAudioState } from "@/types/audio";

const state = (seq: number): BattleAudioState => ({ trackId: "a", track: null, playing: true, offsetSec: 0, startedAt: 0, seq });

describe("mergeAudio", () => {
  it("приймає лише новіший seq", () => {
    expect(mergeAudio(state(2), state(3))?.seq).toBe(3);
    expect(mergeAudio(state(3), state(2))?.seq).toBe(3);
  });

  it("рівний seq (власна відповідь, потім та сама подія) — той самий обʼєкт", () => {
    const cached = state(3);

    expect(mergeAudio(cached, state(3))).toBe(cached);
  });

  it("null/undefined не затирають наявний стан; порожній кеш бере будь-який", () => {
    expect(mergeAudio(state(1), null)?.seq).toBe(1);
    expect(mergeAudio(state(1), undefined)?.seq).toBe(1);
    expect(mergeAudio(null, state(1))?.seq).toBe(1);
  });
});
