// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBattleAudioState } from "../useBattleAudioState";

import { getBattleAudio } from "@/lib/api/battle-audio";
import type { BattleAudioState } from "@/types/audio";

vi.mock("@/lib/api/battle-audio", () => ({ getBattleAudio: vi.fn() }));

const state = (seq: number): BattleAudioState => ({ trackId: "t", track: null, playing: true, offsetSec: 0, startedAt: 0, seq });

function setup(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  return { client, wrapper };
}

describe("useBattleAudioState", () => {
  it("до розблокування — стан зі сцени, без запиту; сцена з новішим seq оновлює, зі старішим — ні", () => {
    const { wrapper } = setup();

    const { result, rerender } = renderHook(({ seed }) => useBattleAudioState({ campaignId: "c1", battleId: "b1", seed, live: false }), { wrapper, initialProps: { seed: state(2) as BattleAudioState | null } });

    expect(result.current).toEqual({ audio: state(2), clockOffsetMs: null });

    rerender({ seed: state(5) });
    expect(result.current.audio?.seq).toBe(5);

    rerender({ seed: state(3) });
    expect(result.current.audio?.seq).toBe(5);

    rerender({ seed: null });
    expect(result.current.audio?.seq).toBe(5);
    expect(getBattleAudio).not.toHaveBeenCalled();
  });

  it("розблокування — один GET: свіжий стан (за seq) і зсув годинника", async () => {
    vi.mocked(getBattleAudio).mockResolvedValue({ audio: state(7), clockOffsetMs: 1_200 });

    const { wrapper } = setup();

    const { result, rerender } = renderHook(({ live }) => useBattleAudioState({ campaignId: "c1", battleId: "b1", seed: state(2), live }), { wrapper, initialProps: { live: false } });

    rerender({ live: true });

    await waitFor(() => expect(result.current).toEqual({ audio: state(7), clockOffsetMs: 1_200 }));
    expect(getBattleAudio).toHaveBeenCalledTimes(1);
  });
});
