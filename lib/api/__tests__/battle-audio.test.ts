import { afterEach, describe, expect, it, vi } from "vitest";

import { getBattleAudio, sendBattleAudio } from "../battle-audio";

describe("battle-audio api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("GET: стан і зсув годинника із заголовка Date", async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 19, 9, 59, 57), toFake: ["Date"] });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ audio: null }), { status: 200, headers: { date: "Mon, 19 Oct 2026 10:00:00 GMT" } })));

    expect(await getBattleAudio("c1", "b1")).toEqual({ audio: null, clockOffsetMs: 3_500 });
  });

  it("POST шле команду на /battles/:id/audio", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ audio: null }), { status: 200 }));

    vi.stubGlobal("fetch", fetch);

    expect(await sendBattleAudio("c1", "b1", { action: "stop" })).toEqual({ audio: null, clockOffsetMs: null });
    expect(fetch).toHaveBeenCalledWith("/api/campaigns/c1/battles/b1/audio", expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "stop" }) }));
  });
});
