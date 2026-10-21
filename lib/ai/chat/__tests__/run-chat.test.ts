import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/threads", () => ({ loadThread: vi.fn(), loadMessages: vi.fn(async () => []), appendMessage: vi.fn() }));
vi.mock("@/lib/ai/credentials", () => {
  class AiKeyUnreadableError extends Error {}

  return { AiKeyUnreadableError, loadApiKey: vi.fn(async () => "sk-test") };
});
vi.mock("@/lib/ai/context/prompt", () => ({ buildInstructions: vi.fn(async () => "ІНСТРУКЦІЇ") }));
vi.mock("@/lib/ai/tools", () => ({ toAiSdkTools: vi.fn(() => ({})) }));

const thread = { id: "t1", mode: "live", scenarioPageId: "p1", title: "x", provider: "anthropic", model: "claude-haiku-4-5-20251001", updatedAt: "", usage: { inputTokens: 0, outputTokens: 0 } };

const textModel = (text: string) =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "1" },
          { type: "text-delta", id: "1", delta: text },
          { type: "text-end", id: "1" },
          { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 5, text: 5, reasoning: 0 } } },
        ],
      }),
    }),
  });

const args = { campaignId: "camp1", userId: "dm", threadId: "t1", text: "Хто охороняє браму?" };

describe("runChat", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { loadThread, appendMessage, loadMessages } = await import("@/lib/ai/threads");

    const stored: unknown[] = [];

    vi.mocked(loadThread).mockResolvedValue(thread as never);
    vi.mocked(appendMessage).mockImplementation(async (_id, m) => void stored.push(m));
    vi.mocked(loadMessages).mockImplementation(async () => stored as never);
  });

  it("стрімить відповідь, зберігає повідомлення користувача ДО стріму і відповідь з usage", async () => {
    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const { appendMessage } = await import("@/lib/ai/threads");

    const res = await runChat(args, { model: textModel("Двоє вартових.") });

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Двоє вартових.");
    expect(vi.mocked(appendMessage).mock.calls[0][1]).toMatchObject({ role: "user", parts: [{ type: "text", text: "Хто охороняє браму?" }] });

    const assistant = vi.mocked(appendMessage).mock.calls.find((c) => c[1].role === "assistant")?.[1];

    expect(assistant?.metadata?.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it("ключ не розшифровується → 400 з підказкою, не 500", async () => {
    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const { AiKeyUnreadableError, loadApiKey } = await import("@/lib/ai/credentials");

    vi.mocked(loadApiKey).mockRejectedValueOnce(new AiKeyUnreadableError());

    const res = await runChat(args);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("збережіть ключ заново");
  });

  it("інструменти отримують сигнал, що спрацьовує разом із клієнтським abort", async () => {
    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const { toAiSdkTools } = await import("@/lib/ai/tools");

    const controller = new AbortController();

    await (await runChat({ ...args, abortSignal: controller.signal }, { model: textModel("ok") })).text();

    const signal = vi.mocked(toAiSdkTools).mock.calls[0][0].abortSignal!;

    expect(signal.aborted).toBe(false);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });

  it("лише текст → жодної пропозиції (propose не викликано)", async () => {
    const { runChat } = await import("@/lib/ai/chat/run-chat");

    await (await runChat(args, { model: textModel("Ось переписаний рядок: …") })).text();

    const { toAiSdkTools } = await import("@/lib/ai/tools");

    expect(toAiSdkTools).toHaveBeenCalledWith(expect.objectContaining({ campaignId: "camp1", userId: "dm", threadId: "t1" }));
  });

  it("чужий тред — 404", async () => {
    const { loadThread } = await import("@/lib/ai/threads");

    vi.mocked(loadThread).mockResolvedValue(null);

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    expect((await runChat(args)).status).toBe(404);
  });

  it("ключ видалено — 400 «Додайте ключ», модель не викликається", async () => {
    const { loadApiKey } = await import("@/lib/ai/credentials");

    vi.mocked(loadApiKey).mockResolvedValue(null);

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const res = await runChat(args);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Додайте ключ");
  });

  it("помилка провайдера → український текст у стрімі, без тексту оригіналу", async () => {
    const { APICallError } = await import("ai");

    const failing = new MockLanguageModelV4({ doStream: async () => { throw new APICallError({ message: "invalid x-api-key sk-test", url: "u", requestBodyValues: {}, statusCode: 401, isRetryable: false }); } });

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const body = await (await runChat(args, { model: failing })).text();

    expect(body).toContain("Ключ недійсний");
    expect(body).not.toContain("sk-test");
  });

  it("логи помилки провайдера не містять тексту оригіналу", async () => {
    const { APICallError } = await import("ai");

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const failing = new MockLanguageModelV4({ doStream: async () => { throw new APICallError({ message: "invalid x-api-key sk-test", url: "u", requestBodyValues: {}, statusCode: 401, isRetryable: false }); } });

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    await (await runChat(args, { model: failing })).text();

    expect(spy).toHaveBeenCalledWith("[ai chat]", 401);
    expect(JSON.stringify(spy.mock.calls)).not.toContain("sk-test");
    spy.mockRestore();
  });

  it("скасування клієнтом зберігає часткову відповідь", async () => {
    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const { appendMessage } = await import("@/lib/ai/threads");

    const hanging = new MockLanguageModelV4({
      doStream: async () => ({
        stream: new ReadableStream({
          start(c) {
            c.enqueue({ type: "text-start", id: "1" });
            c.enqueue({ type: "text-delta", id: "1", delta: "Часткова відповідь" });
          },
        }),
      }),
    });

    const controller = new AbortController();

    const res = await runChat({ ...args, abortSignal: controller.signal }, { model: hanging });

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();

    let seen = "";

    while (!seen.includes("Часткова відповідь")) seen += new TextDecoder().decode((await reader.read()).value);

    await reader.cancel();
    controller.abort();

    await vi.waitFor(() => expect(vi.mocked(appendMessage).mock.calls.some((c) => c[1].role === "assistant")).toBe(true));

    const assistant = vi.mocked(appendMessage).mock.calls.find((c) => c[1].role === "assistant")?.[1];

    expect(JSON.stringify(assistant?.parts)).toContain("Часткова відповідь");
  });

  it("compactHistory стискає старі результати інструментів", async () => {
    const { compactHistory } = await import("@/lib/ai/chat/run-chat");

    const toolMsg = (id: string) => ({ id, role: "assistant" as const, parts: [{ type: "tool-read_scenario_page", toolCallId: id, state: "output-available", input: {}, output: "ДОВГИЙ ТЕКСТ" }] });

    const msgs = Array.from({ length: 10 }, (_, i) => toolMsg(`m${i}`));

    const out = compactHistory(msgs);

    expect(JSON.stringify(out[0])).not.toContain("ДОВГИЙ ТЕКСТ");
    expect(JSON.stringify(out[9])).toContain("ДОВГИЙ ТЕКСТ");
  });
});
