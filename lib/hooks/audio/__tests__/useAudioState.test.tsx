// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AudioHost } from "../host";
import { useAudioState } from "../useAudioState";

import { getBattleAudio } from "@/lib/api/battle-audio";
import { battleKeys } from "@/lib/hooks/battles";
import type { BattleAudioState } from "@/types/audio";

vi.mock("@/lib/api/battle-audio", () => ({ getBattleAudio: vi.fn() }));

const KEY = battleKeys.audio("c1", "b1");

const host = (seed: BattleAudioState | null): AudioHost => ({ campaignId: "c1", isDM: false, queryKey: KEY, seed, fetch: () => getBattleAudio("c1", "b1"), send: vi.fn(), onFailure: vi.fn() });

const state = (seq: number): BattleAudioState => ({ trackId: "t", track: null, playing: true, offsetSec: 0, startedAt: 0, seq });

function setup(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  return { client, wrapper };
}

describe("useAudioState", () => {
  it("до розблокування — стан зі сцени, без запиту; сцена з новішим seq оновлює, зі старішим — ні", () => {
    const { wrapper } = setup();

    const { result, rerender } = renderHook(({ seed }) => useAudioState({ host: host(seed), unlocked: false }), { wrapper, initialProps: { seed: state(2) as BattleAudioState | null } });

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

    const { result, rerender } = renderHook(({ unlocked }) => useAudioState({ host: host(state(2)), unlocked }), { wrapper, initialProps: { unlocked: false } });

    rerender({ unlocked: true });

    await waitFor(() => expect(result.current).toEqual({ audio: state(7), clockOffsetMs: 1_200 }));
    expect(getBattleAudio).toHaveBeenCalledTimes(1);
  });

  it("із типовим staleTime 60 с: сцена й Pusher уже записали кеш — розблокування все одно один GET (годинник)", async () => {
    vi.mocked(getBattleAudio).mockClear().mockResolvedValue({ audio: state(4), clockOffsetMs: -3_000 });

    const { client, wrapper } = setup(new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } }));

    const { result, rerender } = renderHook(({ unlocked }) => useAudioState({ host: host(state(2)), unlocked }), { wrapper, initialProps: { unlocked: false } });

    client.setQueryData(battleKeys.audio("c1", "b1"), { audio: state(3), clockOffsetMs: null });
    rerender({ unlocked: true });

    await waitFor(() => expect(result.current).toEqual({ audio: state(4), clockOffsetMs: -3_000 }));
    expect(getBattleAudio).toHaveBeenCalledTimes(1);
  });

  it("Pusher записав новіший seq, поки GET у польоті — GET його не затирає", async () => {
    let resolve!: (v: { audio: BattleAudioState; clockOffsetMs: number }) => void;

    vi.mocked(getBattleAudio)
      .mockClear()
      .mockReturnValue(new Promise((r) => (resolve = r)));

    const { client, wrapper } = setup();

    const { result, rerender } = renderHook(({ unlocked }) => useAudioState({ host: host(state(2)), unlocked }), { wrapper, initialProps: { unlocked: false } });

    rerender({ unlocked: true });
    await waitFor(() => expect(getBattleAudio).toHaveBeenCalled());

    act(() => client.setQueryData(KEY, { audio: state(5), clockOffsetMs: null }));
    resolve({ audio: state(4), clockOffsetMs: 900 });

    await waitFor(() => expect(result.current.clockOffsetMs).toBe(900));
    expect(result.current.audio?.seq).toBe(5);
  });
});
