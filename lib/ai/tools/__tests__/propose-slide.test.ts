import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

const h = vi.hoisted(() => ({ loadApiKey: vi.fn(), generate: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { scenarioPage: { findFirst: vi.fn() }, slideDeck: { findFirst: vi.fn() }, aiProposal: { create: vi.fn() } } }));
vi.mock("@/lib/ai/credentials", () => ({ loadApiKey: h.loadApiKey }));
vi.mock("@/lib/ai/images", () => {
  class AiImageError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  }

  return { AiImageError, generateSlideImage: h.generate };
});

const ctx = { campaignId: "camp1", userId: "dm", threadId: "t1" };

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
});
