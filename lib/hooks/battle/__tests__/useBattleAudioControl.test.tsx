// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBattleAudioControl } from "../useBattleAudioControl";

import { sendBattleAudio } from "@/lib/api/battle-audio";

vi.mock("@/lib/api/battle-audio", () => ({ sendBattleAudio: vi.fn() }));

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;

describe("useBattleAudioControl", () => {
  it("подвійний клік (дві команди до рендеру) — один POST; після відповіді наступна команда йде", async () => {
    let resolve: () => void = () => undefined;

    vi.mocked(sendBattleAudio).mockImplementation(() => new Promise((r) => (resolve = () => r({ audio: null, clockOffsetMs: 0 }))));

    const { result } = renderHook(() => useBattleAudioControl({ campaignId: "c1", battleId: "b1", enabled: true, onFailure: vi.fn() }), { wrapper });

    act(() => {
      result.current?.send({ action: "pause" });
      result.current?.send({ action: "pause" });
    });

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    expect(sendBattleAudio).toHaveBeenCalledTimes(1);

    await act(async () => resolve());
    await waitFor(() => expect(result.current?.pending).toBe(false));

    act(() => result.current?.send({ action: "resume" }));
    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledTimes(2));
    expect(sendBattleAudio).toHaveBeenLastCalledWith("c1", "b1", { action: "resume" });
  });
});
