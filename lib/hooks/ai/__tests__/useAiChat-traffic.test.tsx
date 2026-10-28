// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiThread } from "@/types/ai";

type FinishOptions = { isAbort: boolean; isDisconnect: boolean; isError: boolean };

const sdk = vi.hoisted(() => ({ messages: [], sendMessage: vi.fn(async () => {}), stop: vi.fn(async () => {}), setMessages: vi.fn(), status: "ready", error: undefined, onFinish: undefined as ((o: FinishOptions) => void) | undefined }));

vi.mock("@ai-sdk/react", () => ({ useChat: (options: { onFinish: (o: FinishOptions) => void }) => { sdk.onFinish = options.onFinish;

 return sdk; } }));
vi.mock("@/lib/api/ai", () => ({ createAiChatTransport: vi.fn(), getAiRunRecovery: vi.fn(), cancelAiRun: vi.fn() }));
import { getAiRunRecovery } from "@/lib/api/ai";
import { useAiChat } from "@/lib/hooks/ai/useAiChat";

const thread = { id: "t" } as AiThread;

const running = { runs: [{ requestId: "r", status: "running", abortRequested: false, expiresAt: "" }], messages: [], receipts: [] };

const idle = { runs: [], messages: [], receipts: [] };

const setup = () => renderHook(() => useAiChat({ campaignId: "c", thread, initialMessages: [], getFocus: () => undefined }));

const setHidden = (value: boolean) => {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
  document.dispatchEvent(new Event("visibilitychange"));
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  setHidden(false);
});
afterEach(() => vi.useRealTimers());

describe("assistant chat traffic", () => {
  it("polls a recovering run at most 6 times in 20 s, all status-only", async () => {
    vi.mocked(getAiRunRecovery).mockResolvedValue(running);

    const { unmount } = setup();

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });

    const calls = vi.mocked(getAiRunRecovery).mock.calls;

    expect(calls.length - 1).toBeLessThanOrEqual(6);
    expect(calls.length).toBeGreaterThan(1);
    expect(calls.slice(1).every(c => c[3]?.statusOnly === true)).toBe(true);
    expect(sdk.setMessages).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("does not poll while the page is hidden", async () => {
    vi.mocked(getAiRunRecovery).mockResolvedValue(running);
    setHidden(true);

    const { unmount } = setup();

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(vi.mocked(getAiRunRecovery)).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("reloads messages once when the polled run finishes", async () => {
    vi.mocked(getAiRunRecovery).mockResolvedValueOnce(running).mockResolvedValueOnce(running).mockResolvedValue(idle);

    const { unmount } = setup();

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(sdk.setMessages).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(sdk.setMessages).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getAiRunRecovery).mock.calls.at(-1)).toHaveLength(2);
    unmount();
  });

  it("a normally finished stream does not refetch recovery, an aborted one does", async () => {
    vi.mocked(getAiRunRecovery).mockResolvedValue(idle);

    const { result, unmount } = setup();

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    sdk.sendMessage.mockImplementationOnce(async () => { sdk.onFinish?.({ isAbort: false, isDisconnect: false, isError: false }); });
    await act(() => result.current.send("Привіт"));
    expect(vi.mocked(getAiRunRecovery)).toHaveBeenCalledTimes(1);
    sdk.sendMessage.mockImplementationOnce(async () => { sdk.onFinish?.({ isAbort: false, isDisconnect: true, isError: false }); });
    await act(() => result.current.send("Ще"));
    expect(vi.mocked(getAiRunRecovery)).toHaveBeenCalledTimes(2);
    unmount();
  });
});
