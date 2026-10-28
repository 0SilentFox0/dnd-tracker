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
vi.mock("@/lib/utils/api/translate-error", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/api/translate-error")>();

  return { ...actual, requestTranslator: vi.fn(actual.requestTranslator) };
});

vi.mock("@/lib/server/assistant/runs", async () => ({
  createRunSignal: (await import("@/lib/ai/chat/run-signal")).createRunSignal,
  RUN_GRACE_MS: 30000,
  beginAssistantRun: vi.fn(async (_caller, requestId, input) => {
    const { appendMessage } = await import("@/lib/ai/threads");

    await appendMessage("t1", { role: "user", parts: [{ type: "text", text: input?.text ?? "" }] });

    return { replayed: false, run: { id: "run1", requestId, status: "running", expiresAt: new Date(Date.now() + 300000), abortRequested: false } };
  }),
  recordAssistantRunUsage: vi.fn(),
  finishAssistantRun: vi.fn(), readAssistantRuns: vi.fn(async () => ({ runs: [], receipts: [] })),
  isAssistantRunCancelled: vi.fn(async () => false),
}));

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

const args = { campaignId: "camp1", userId: "dm", threadId: "t1", requestId: "req1", text: "Хто охороняє браму?" };

describe("runChat", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { loadThread, appendMessage, loadMessages } = await import("@/lib/ai/threads");

    const stored: unknown[] = [];

    vi.mocked(loadThread).mockResolvedValue(thread as never);
    vi.mocked(appendMessage).mockImplementation(async (_id, m) => void stored.push(m));
    vi.mocked(loadMessages).mockImplementation(async () => stored as never);
  });

  it("T18 validated UI note selection reaches context separately and is bound to request identity", async () => {
    const {runChat}=await import("@/lib/ai/chat/run-chat");

    const {buildInstructions}=await import("@/lib/ai/context/prompt");

    const {beginAssistantRun}=await import("@/lib/server/assistant/runs");

    const response=await runChat({...args,sessionContext:{sourceNoteKeys:["own-note"]}},{model:textModel("Відповідь")});

    await response.text();
    expect(buildInstructions).toHaveBeenCalledWith(expect.objectContaining({sourceNoteSelection:{source:"session-ui",selectedKeys:["own-note"]},caller:expect.objectContaining({tokenId:null,runId:"run1"})}));
    expect(beginAssistantRun).toHaveBeenCalledWith(expect.anything(),"req1",expect.objectContaining({sessionContext:{sourceNoteKeys:["own-note"]}}));
  });
  it("T18 empty selection never means all notes", async () => {
    const {runChat}=await import("@/lib/ai/chat/run-chat");

    const {buildInstructions}=await import("@/lib/ai/context/prompt");

    const response=await runChat({...args,sessionContext:{sourceNoteKeys:[]}},{model:textModel("Відповідь")});

    await response.text();
    expect(vi.mocked(buildInstructions).mock.calls[0][0]).not.toHaveProperty("sourceNoteSelection");
  });

  it("historical tool results are redacted before reaching the provider without rewriting stored history", async () => {
    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const { loadMessages } = await import("@/lib/ai/threads");

    const history = [{ id: "old-tool", role: "assistant" as const, parts: [{ type: "tool-get_show_state", toolCallId: "old-call", state: "output-available", input: {}, output: { image: "https://storage.invalid/object/sign/slides/file?token=PRIVATE_SIGNATURE" } }] }];

    vi.mocked(loadMessages).mockResolvedValue(history);

    let prompt = "";

    const model = new MockLanguageModelV4({ doStream: async options => {
      prompt = JSON.stringify(options.prompt);

      return textModel("Безпечна відповідь").doStream(options);
    } });

    await (await runChat(args, { model })).text();
    expect(prompt).toContain("приховане посилання");
    expect(prompt).not.toContain("PRIVATE_SIGNATURE");
    expect(history[0].parts[0].output.image).toContain("PRIVATE_SIGNATURE");
  });

  it("стрімить відповідь, зберігає повідомлення користувача ДО стріму і відповідь з usage", async () => {
    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const { appendMessage } = await import("@/lib/ai/threads");

    const res = await runChat(args, { model: textModel("Двоє вартових.") });

    const { toAiSdkTools } = await import("@/lib/ai/tools");

    expect(toAiSdkTools).toHaveBeenCalledWith(expect.objectContaining({ caller: { actor: { campaignId: "camp1", userId: "dm", isDM: true, via: "session", scopes: null }, channel: "chat", threadId: "t1", tokenId: null, runId: "run1" } }));

    const { buildInstructions } = await import("@/lib/ai/context/prompt");

    expect(buildInstructions).toHaveBeenCalledWith(expect.objectContaining({ caller: expect.objectContaining({ tokenId: null, runId: "run1", threadId: "t1" }) }));
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

    const signal = vi.mocked(toAiSdkTools).mock.calls[0][0].abortSignal;

    if (!signal) throw new Error("Missing tool signal");

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

  it("метадані з помилкою провайдера зберігають результат перекладу, не ключ", async () => {
    const { APICallError } = await import("ai");

    const { requestTranslator } = await import("@/lib/utils/api/translate-error");

    const { appendMessage } = await import("@/lib/ai/threads");

    vi.mocked(requestTranslator).mockResolvedValueOnce(Object.assign((key: string) => `T(${key})`, { has: () => true, raw: () => ({}) }));

    const failing = new MockLanguageModelV4({ doStream: async () => { throw new APICallError({ message: "bad", url: "u", requestBodyValues: {}, statusCode: 401, isRetryable: false }); } });

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    await (await runChat(args, { model: failing })).text();

    const saved = vi.mocked(appendMessage).mock.calls.map((c) => c[1]).find((m) => m.role === "assistant");

    expect((saved?.metadata as { error?: string }).error).toMatch(/^T\(.+\)$/);
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

  it("model and tools share cancellation and provider retries are disabled", async () => {
    let modelSignal: AbortSignal | undefined;

    let attempts = 0;

    const controller = new AbortController();

    const { APICallError } = await import("ai");

    const model = new MockLanguageModelV4({ doStream: async options => {
      modelSignal = options.abortSignal;
      attempts++;
      throw new APICallError({ message: "retryable", url: "u", requestBodyValues: {}, statusCode: 503, isRetryable: true });
    } });

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    await (await runChat({ ...args, abortSignal: controller.signal }, { model })).text();

    const { toAiSdkTools } = await import("@/lib/ai/tools");

    expect(modelSignal).toBe(vi.mocked(toAiSdkTools).mock.calls[0][0].abortSignal);
    expect(attempts).toBe(1);
  });

  it("replayed submit recovers status without model or second message", async () => {
    const { beginAssistantRun } = await import("@/lib/server/assistant/runs");

    vi.mocked(beginAssistantRun).mockResolvedValueOnce({ replayed: true, run: { id: "run1", requestId: args.requestId, status: "cancelled", expiresAt: new Date(), abortRequested: true } });

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const { appendMessage } = await import("@/lib/ai/threads");

    const response = await runChat(args, { model: textModel("must not run") });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ recovered: true });
    expect(appendMessage).not.toHaveBeenCalled();
  });

  it("unknown provider usage persists null rather than zero", async () => {
    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const { appendMessage } = await import("@/lib/ai/threads");

    const model = new MockLanguageModelV4({ doStream: async () => ({ stream: simulateReadableStream({ chunks: [
      { type: "text-start", id: "1" }, { type: "text-delta", id: "1", delta: "ok" }, { type: "text-end", id: "1" },
      { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: undefined, text: undefined, reasoning: undefined } } },
    ] }) }) });

    await (await runChat(args, { model })).text();
    expect(vi.mocked(appendMessage).mock.calls.find(c => c[1].role === "assistant")?.[1].metadata?.usage).toMatchObject({ inputTokens: null, outputTokens: null });
  });

  it("replay returns compacted old tool outputs", async () => {
    const { beginAssistantRun } = await import("@/lib/server/assistant/runs");

    const { loadMessages } = await import("@/lib/ai/threads");

    const big = "ДОВГИЙ ТЕКСТ".repeat(300);

    vi.mocked(loadMessages).mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, role: "assistant" as const, parts: [{ type: "tool-x", output: big }] })) as never);
    vi.mocked(beginAssistantRun).mockResolvedValueOnce({ replayed: true, run: { id: "run1", requestId: args.requestId, status: "completed", expiresAt: new Date(), abortRequested: false } });

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    const body = await (await runChat(args, { model: textModel("x") })).json();

    expect(JSON.stringify(body.messages[0])).not.toContain("ДОВГИЙ");
    expect(JSON.stringify(body.messages[9])).toContain("ДОВГИЙ");
  });

  it("cancel is checked at step boundaries and stops the run", async () => {
    const { isAssistantRunCancelled, finishAssistantRun } = await import("@/lib/server/assistant/runs");

    vi.mocked(isAssistantRunCancelled).mockResolvedValue(true);

    const { runChat } = await import("@/lib/ai/chat/run-chat");

    await (await runChat(args, { model: textModel("ok") })).text();
    expect(isAssistantRunCancelled).toHaveBeenCalled();
    expect(finishAssistantRun).toHaveBeenLastCalledWith("run1", expect.objectContaining({ status: "cancelled" }));
    vi.mocked(isAssistantRunCancelled).mockResolvedValue(false);
  });

  it("slow poll queries the run at most 5 times in 10s", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      const { isAssistantRunCancelled } = await import("@/lib/server/assistant/runs");

      const hanging = new MockLanguageModelV4({ doStream: async () => ({ stream: new ReadableStream({ start(c) { c.enqueue({ type: "text-start", id: "1" }); } }) }) });

      const { runChat } = await import("@/lib/ai/chat/run-chat");

      await runChat(args, { model: hanging });
      await vi.advanceTimersByTimeAsync(10_000);
      expect(vi.mocked(isAssistantRunCancelled).mock.calls.length).toBeLessThanOrEqual(5);
      expect(vi.mocked(isAssistantRunCancelled).mock.calls.length).toBeGreaterThan(0);
    } finally { vi.useRealTimers(); }
  });
});

describe("T15 real stream boundaries", () => {
  it("deadline aborts the provider stream and the exact tool signal at 270000ms", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    try {
      const { loadThread, loadMessages, appendMessage } = await import("@/lib/ai/threads");

      vi.mocked(loadThread).mockResolvedValue(thread as never);
      vi.mocked(loadMessages).mockResolvedValue([{ id: "u", role: "user", parts: [{ type: "text", text: "Привіт" }] }]);
      vi.mocked(appendMessage).mockResolvedValue();

      let modelSignal: AbortSignal | undefined;

      const hanging = new MockLanguageModelV4({ doStream: async options => {
        modelSignal = options.abortSignal;

        return { stream: new ReadableStream({ start(c) {
          c.enqueue({ type: "text-start", id: "1" });
          c.enqueue({ type: "text-delta", id: "1", delta: "Початок" });
        } }) };
      } });

      const { runChat } = await import("@/lib/ai/chat/run-chat");

      const response = await runChat(args, { model: hanging });

      if (!response.body) throw new Error("Missing body");

      const reader = response.body.getReader();

      let text = "";

      while (!text.includes("Початок")) { const chunk = await reader.read();

 if (chunk.done) throw new Error(text);

 text += new TextDecoder().decode(chunk.value); }

      const { toAiSdkTools } = await import("@/lib/ai/tools");

      const toolSignal = vi.mocked(toAiSdkTools).mock.calls.at(-1)?.[0].abortSignal;

      await vi.advanceTimersByTimeAsync(269999);
      expect(modelSignal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(modelSignal?.aborted).toBe(true);
      expect(toolSignal).toBe(modelSignal);
      expect(toolSignal?.aborted).toBe(true);
      while (!(await reader.read()).done) { /* drain to persist final partial message */ }

      const { finishAssistantRun } = await import("@/lib/server/assistant/runs");

      expect(finishAssistantRun).toHaveBeenLastCalledWith("run1", expect.objectContaining({ status: "cancelled", usage: expect.objectContaining({ inputTokens: null, outputTokens: null }) }));
    } finally { vi.useRealTimers(); }
  });
});
