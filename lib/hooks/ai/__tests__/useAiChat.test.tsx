// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AiThread } from "@/types/ai";

const sdk = vi.hoisted(() => ({ messages: [], sendMessage: vi.fn(async () => {}), stop: vi.fn(async () => {}), setMessages: vi.fn(), status: "ready", error: undefined }));

vi.mock("@ai-sdk/react", () => ({ useChat: () => sdk }));
vi.mock("@/lib/api/ai", () => ({ createAiChatTransport: vi.fn(), getAiRunRecovery: vi.fn(async () => ({ runs: [], messages: [], receipts: [] })), cancelAiRun: vi.fn(async () => ({})) }));
import { cancelAiRun,getAiRunRecovery } from "@/lib/api/ai";
import { useAiChat } from "@/lib/hooks/ai/useAiChat";

const thread = { id: "t" } as AiThread;

const setup = () => renderHook(() => useAiChat({ campaignId: "c", thread, initialMessages: [], getFocus: () => undefined }));

beforeEach(() => vi.clearAllMocks());
describe("T15 chat recovery", () => {
  it("double click sends once and every explicit new request gets a fresh identity", async () => {
    const { result } = setup();

    await waitFor(() => expect(getAiRunRecovery).toHaveBeenCalledOnce());

    let resolve!: () => void;

    sdk.sendMessage.mockImplementationOnce(() => new Promise<void>(r => { resolve = r; }));

    let first!: Promise<void>;

    act(() => { first = result.current.send("Перше"); void result.current.send("Перше"); });
    expect(sdk.sendMessage).toHaveBeenCalledOnce();
    await act(async () => { resolve(); await first; });
    await act(() => result.current.send("Друге"));

    const sent = sdk.sendMessage.mock.calls as unknown as [{ id: string }][];

    expect(sent[0][0].id).toBeTruthy();
    expect(sent[1][0].id).not.toBe(sent[0][0].id);
  });
  it("Stop cancels the server request and reloads committed receipt, reconnect only reads", async () => {
    vi.mocked(getAiRunRecovery).mockResolvedValueOnce({ runs: [{ requestId: "req", status: "running", abortRequested: false, expiresAt: "" }], messages: [], receipts: [] });

    const { result, unmount } = setup();

    await waitFor(() => expect(result.current.status).toBe("streaming"));
    vi.mocked(getAiRunRecovery).mockResolvedValue({ runs: [], messages: [], receipts: [{ id: "receipt", intentId: "i", status: "applied", result: null, effectsStatus: "complete" }] });
    await act(() => result.current.stop());
    expect(cancelAiRun).toHaveBeenCalledWith("c", "t", "req");
    expect(JSON.stringify(sdk.setMessages.mock.calls.at(-1))).toContain("ai.chat.receipt");
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(sdk.sendMessage).not.toHaveBeenCalled();
    unmount();
  });
  it("a late reconnect snapshot cannot unlock a locally streaming submit", async () => {
    let finishRecovery!: (value: Awaited<ReturnType<typeof getAiRunRecovery>>) => void;

    let finishSend!: () => void;

    vi.mocked(getAiRunRecovery).mockImplementationOnce(() => new Promise(resolve => { finishRecovery = resolve; }));
    sdk.sendMessage.mockImplementationOnce(() => new Promise<void>(resolve => { finishSend = resolve; }));

    const { result, unmount } = setup();

    let sent!: Promise<void>;

    act(() => { sent = result.current.send("Перше"); });
    await act(async () => finishRecovery({ runs: [], messages: [], receipts: [] }));
    act(() => { void result.current.send("Дубль"); });

    const attempts = sdk.sendMessage.mock.calls.length;

    await act(async () => { finishSend(); await sent; });
    unmount();
    expect(attempts).toBe(1);
  });

});

it("terminalLeaseNeverPretendsNewRequestIsAvailable",async()=>{
 vi.mocked(getAiRunRecovery).mockResolvedValueOnce({runs:[{requestId:"old",status:"completed",abortRequested:false,expiresAt:new Date(Date.now()+60000).toISOString()}],messages:[],receipts:[]});

 const {result}=setup();

 await waitFor(()=>expect(result.current.blockedUntil).toBeTruthy());
 await act(()=>result.current.send("Новий запит"));
 expect(sdk.sendMessage).not.toHaveBeenCalled();expect(result.current.error?.message).toMatch(/chat\.leaseBlocked/);
});
