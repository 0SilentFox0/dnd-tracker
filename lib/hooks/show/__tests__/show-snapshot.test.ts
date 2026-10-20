import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { showKeys } from "../keys";
import { writeShowSnapshot } from "../show-snapshot";

import type { BattleAudioState } from "@/types/audio";
import type { ShowState } from "@/types/show";

const audio = (seq: number): BattleAudioState => ({ trackId: "t", track: null, playing: true, offsetSec: 0, startedAt: 0, seq });

const st = (seq: number, audioSeq: number): ShowState => ({ deckId: "d1", deckTitle: "Т", slide: null, nextImageUrl: null, audio: audio(audioSeq), seq });

describe("writeShowSnapshot", () => {
  it("пише стан показу за seq і аудіо в кеш плеєра; старіша подія не відкочує", () => {
    const qc = new QueryClient();

    writeShowSnapshot(qc, "c1", { show: st(5, 3), clockOffsetMs: 12 });
    writeShowSnapshot(qc, "c1", { show: st(4, 2) });

    expect(qc.getQueryData(showKeys.state("c1"))).toEqual({ show: st(5, 3), clockOffsetMs: 12 });
    expect(qc.getQueryData(showKeys.audio("c1"))).toEqual({ audio: audio(3), clockOffsetMs: 12 });

    writeShowSnapshot(qc, "c1", { show: st(6, 4) });

    expect(qc.getQueryData(showKeys.state("c1"))).toEqual({ show: st(6, 4), clockOffsetMs: 12 });
  });
});
