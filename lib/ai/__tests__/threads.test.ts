import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  aiThread: { findMany: vi.fn(), create: vi.fn() },
  aiMessage: { findMany: vi.fn() },
  aiCredential: { findUnique: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const row = (id: string) => ({ id, mode: "live", scenarioPageId: null, title: id, provider: "anthropic", model: "m", updatedAt: new Date(0) });

describe("threads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listThreads рахує токени всіх тредів одним запитом", async () => {
    const { listThreads } = await import("@/lib/ai/threads");

    prismaMock.aiThread.findMany.mockResolvedValue([row("a"), row("b"), row("c")]);
    prismaMock.aiMessage.findMany.mockResolvedValue([
      { threadId: "a", metadata: { usage: { inputTokens: 10, outputTokens: 5 } } },
      { threadId: "a", metadata: { usage: { inputTokens: 1, outputTokens: 2 } } },
      { threadId: "b", metadata: {} },
    ]);

    const list = await listThreads("camp", "dm");

    expect(prismaMock.aiMessage.findMany).toHaveBeenCalledTimes(1);
    expect(list.map((t) => t.usage)).toEqual([
      { inputTokens: 11, outputTokens: 7 },
      { inputTokens: 0, outputTokens: 0 },
      { inputTokens: 0, outputTokens: 0 },
    ]);
  });

  it("createThread без model бере defaultModel ключа", async () => {
    const { createThread } = await import("@/lib/ai/threads");

    prismaMock.aiThread.create.mockResolvedValue(row("x"));

    const { AI_MODELS } = await import("@/lib/constants/ai");

    const known = AI_MODELS.anthropic[AI_MODELS.anthropic.length - 1].id;

    prismaMock.aiCredential.findUnique.mockResolvedValue({ defaultModel: known });
    await createThread("camp", "dm", { mode: "live", provider: "anthropic" });

    expect(prismaMock.aiThread.create.mock.calls[0][0].data.model).toBe(known);
  });

  it("resolveDefaultModel: невідома модель ключа → дефолт режиму", async () => {
    const { resolveDefaultModel } = await import("@/lib/ai/threads");

    const { defaultModelFor } = await import("@/lib/constants/ai");

    prismaMock.aiCredential.findUnique.mockResolvedValue({ defaultModel: "nope" });

    expect(await resolveDefaultModel("dm", "anthropic", "scenario")).toBe(defaultModelFor("anthropic", "scenario"));
  });
});
