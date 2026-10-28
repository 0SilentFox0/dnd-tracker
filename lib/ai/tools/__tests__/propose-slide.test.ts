import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

const h = vi.hoisted(() => ({ loadApiKey: vi.fn(), generate: vi.fn(), remove: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { scenarioPage: { findFirst: vi.fn() }, slideDeck: { findFirst: vi.fn() }, aiProposal: { create: vi.fn() } } }));
vi.mock("@/lib/ai/credentials", () => {
  class AiKeyUnreadableError extends Error {}

  return { AiKeyUnreadableError, loadApiKey: h.loadApiKey };
});
vi.mock("@/lib/supabase/scene-slide-storage", () => ({ removeSlideFiles: h.remove }));
vi.mock("@/lib/ai/images", () => {
  class AiImageError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  }

  return { AiImageError, generateSlideImage: h.generate };
});

const ctx = { campaignId: "camp1", userId: "dm", scopes: ["ai"] as const, threadId: "t1" };

const opsOf = () => (vi.mocked(prisma.aiProposal.create).mock.calls[0][0].data as unknown as { ops: Record<string, unknown>[] }).ops;

describe("propose_scene_slide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "М", kind: "scene", content: { legend: [], sections: [] } } as never);
    vi.mocked(prisma.aiProposal.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => ({ id: "ap1", ...data, status: "pending", appliedVersion: null, createdAt: new Date() })) as never);
    h.loadApiKey.mockImplementation(async (_u: string, provider: string) => (provider === "openai" ? "k" : null));
    h.generate.mockResolvedValue({ url: "https://x/img.webp" });
  });

  const run = async (input: Record<string, unknown>) => (await import("@/lib/ai/tools/propose-slide")).proposeSceneSlideTool.handler(ctx, { pageId: "p1", prompt: "Темний собор", aspect: "16:9", ...input } as never);

  it("першим бере набір сцени і створює addSlide-пропозицію", async () => {
    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue({ id: "d1", title: "Собор" } as never);

    expect(await run({ title: "Вхід" })).toMatchObject({ proposalId: "ap1", status: "pending" });
    expect(vi.mocked(prisma.slideDeck.findFirst).mock.calls[0][0]).toMatchObject({ where: { campaignId: "camp1", scenarioPageId: "p1" } });
    expect(h.generate).toHaveBeenCalledWith(expect.objectContaining({ provider: "openai", model: "gpt-image-2", useCampaignStyle: true }));
    expect(opsOf()[0]).toMatchObject({ op: "addSlide", deckId: "d1", slide: { imageUrl: "https://x/img.webp", title: "Вхід" } });
  });

  it("deckId з кампанії береться як є; чужий — помилка", async () => {
    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValueOnce({ id: "d9", title: "Інший" } as never);
    await run({ deckId: "d9" });
    expect(opsOf()[0]).toMatchObject({ deckId: "d9" });

    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValueOnce(null);
    await expect(run({ deckId: "zz" })).rejects.toThrow("zz");
  });

  it("немає набору сцени → deckId null", async () => {
    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue(null);
    await run({});
    expect(opsOf()[0]).toMatchObject({ deckId: null });
  });

  it("без ключа, що малює → AiToolError, нічого не згенеровано", async () => {
    h.loadApiKey.mockResolvedValue(null);
    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue(null);
    await expect(run({})).rejects.toThrow("Немає ключа");
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("AiImageError перетворюється на AiToolError", async () => {
    const { AiImageError } = await import("@/lib/ai/images");

    const { AiToolError } = await import("@/lib/ai/tools/define");

    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue(null);
    h.generate.mockRejectedValue(new AiImageError("Фільтр безпеки", 422));
    await expect(run({})).rejects.toBeInstanceOf(AiToolError);
    expect(prisma.aiProposal.create).not.toHaveBeenCalled();
  });

  it("створення пропозиції впало після генерації → файл видаляється", async () => {
    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.aiProposal.create).mockRejectedValueOnce(new Error("db"));

    await expect(run({})).rejects.toThrow("db");
    expect(h.remove).toHaveBeenCalledWith("camp1", ["https://x/img.webp"]);
  });

  it("сигнал запиту передається в генерацію", async () => {
    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue(null);

    const abortSignal = new AbortController().signal;

    await (await import("@/lib/ai/tools/propose-slide")).proposeSceneSlideTool.handler({ ...ctx, abortSignal }, { pageId: "p1", prompt: "x", aspect: "16:9" } as never);
    expect(h.generate).toHaveBeenCalledWith(expect.objectContaining({ abortSignal }));
  });

  it("друга картинка в тому ж запиті → AiToolError, генерація одна", async () => {
    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue(null);

    const { proposeSceneSlideTool } = await import("@/lib/ai/tools/propose-slide");

    const withUsage = { ...ctx, usage: { images: 0 } };

    const input = { pageId: "p1", prompt: "x", aspect: "16:9" } as never;

    await proposeSceneSlideTool.handler(withUsage, input);
    await expect(proposeSceneSlideTool.handler(withUsage, input)).rejects.toThrow("одна картинка");
    expect(h.generate).toHaveBeenCalledTimes(1);
  });

  it("нечитабельний ключ OpenAI не блокує робочий Google; якщо робочого немає — підказка", async () => {
    const { AiKeyUnreadableError } = await import("@/lib/ai/credentials");

    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue(null);
    h.loadApiKey.mockImplementation(async (_u: string, provider: string) => {
      if (provider === "openai") throw new AiKeyUnreadableError();

      return provider === "google" ? "g" : null;
    });

    await run({});
    expect(h.generate).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));

    h.loadApiKey.mockImplementation(async () => {
      throw new AiKeyUnreadableError();
    });
    await expect(run({})).rejects.toThrow("збережіть ключ заново");
  });

  it("паралельні виклики з одним лічильником: одна генерація, одна відмова", async () => {
    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue(null);

    const { proposeSceneSlideTool } = await import("@/lib/ai/tools/propose-slide");

    const withUsage = { ...ctx, usage: { images: 0 } };

    const input = { pageId: "p1", prompt: "x", aspect: "16:9" } as never;

    const results = await Promise.allSettled([proposeSceneSlideTool.handler(withUsage, input), proposeSceneSlideTool.handler(withUsage, input)]);

    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason.message).toBe("За один запит — одна картинка");
    expect(h.generate).toHaveBeenCalledTimes(1);
  });

  it("помилка до генерації повертає квоту", async () => {
    h.loadApiKey.mockResolvedValue(null);
    vi.mocked(prisma.slideDeck.findFirst).mockResolvedValue(null);

    const { proposeSceneSlideTool } = await import("@/lib/ai/tools/propose-slide");

    const withUsage = { ...ctx, usage: { images: 0 } };

    await expect(proposeSceneSlideTool.handler(withUsage, { pageId: "p1", prompt: "x", aspect: "16:9" } as never)).rejects.toThrow("Немає ключа");
    expect(withUsage.usage.images).toBe(0);
  });
});
