import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_SLIDES_PER_DECK } from "@/lib/constants/show";

const h = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(async () => [{ id: "camp" }]),
    assistantIntent: { findUnique: vi.fn(async () => null) },
    aiProposal: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    scenarioPage: { findFirst: vi.fn() },
    slideDeck: { findFirst: vi.fn(), aggregate: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn(), findMany: vi.fn() },
  };

  return { tx, remove: vi.fn() };
});

vi.mock("@/lib/db", () => ({ prisma: { ...h.tx, $transaction: (fn: (t: typeof h.tx) => unknown) => fn(h.tx) } }));
vi.mock("@/lib/supabase/scene-slide-storage", () => ({ removeSlideFiles: h.remove }));
vi.mock("@/lib/server/scenario/versions", () => ({ snapshotIfDue: vi.fn(), pruneVersions: vi.fn() }));

const slide = { id: "slide-new-1", imageUrl: "https://x/new.webp" };

const stored = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `slide-${i}-xxxx`, imageUrl: `https://x/${i}.webp` }));

const deckRow = (slides: unknown[], id = "d1") => ({ id, campaignId: "camp", title: "Набір", scenarioPageId: "p", slides, sortOrder: 0, createdAt: new Date(), updatedAt: new Date(1000) });

const proposal = (deckId: string | null, status = "pending") => ({ id: "pr", pageId: "p", status, ops: [{ op: "addSlide", deckId, slide }] });

describe("applyProposal addSlide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.tx.aiProposal.updateMany.mockResolvedValue({ count: 1 });
    h.tx.slideDeck.updateMany.mockResolvedValue({ count: 1 });
    h.tx.slideDeck.findUniqueOrThrow.mockImplementation(async () => deckRow([...stored(1), slide]));
  });

  const apply = async () => (await import("@/lib/ai/proposals")).applyProposal("camp", "dm", "pr");

  it("додає слайд у наявний набір", async () => {
    h.tx.aiProposal.findFirst.mockResolvedValue(proposal("d1"));
    h.tx.slideDeck.findFirst.mockResolvedValue(deckRow(stored(1)));

    const res = await apply();

    expect(res).toMatchObject({ ok: true, deck: { id: "d1" } });
    expect(h.tx.slideDeck.updateMany.mock.calls[0][0].data.slides).toEqual([...stored(1), slide]);
    expect(h.tx.aiProposal.updateMany).toHaveBeenCalledWith({ where: { id: "pr", campaignId: "camp", status: "pending" }, data: { status: "applied" } });
  });

  it("паралельне застосування без deckId не створює другий набір", async () => {
    h.tx.aiProposal.findFirst.mockResolvedValue(proposal(null));
    h.tx.aiProposal.updateMany.mockResolvedValue({ count: 0 });

    expect(await apply()).toEqual({ ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_DONE });
    expect(h.tx.slideDeck.create).not.toHaveBeenCalled();
    expect(h.tx.slideDeck.updateMany).not.toHaveBeenCalled();
  });

  it("пошкоджені слайди набору не затираються → 409, пропозиція знову pending", async () => {
    h.tx.aiProposal.findFirst.mockResolvedValue(proposal("d1"));
    h.tx.slideDeck.findFirst.mockResolvedValue(deckRow([{ id: "x", imageUrl: 5 }]));

    expect(await apply()).toEqual({ ok: false, status: 409, error: API_ERRORS.DECK_CORRUPT });
    expect(h.tx.slideDeck.updateMany).not.toHaveBeenCalled();
    expect(h.tx.aiProposal.updateMany).toHaveBeenLastCalledWith({ where: { id: "pr" }, data: { status: "pending" } });
  });

  it("без deckId створює набір з назвою сторінки", async () => {
    h.tx.aiProposal.findFirst.mockResolvedValue(proposal(null));
    h.tx.scenarioPage.findFirst.mockResolvedValue({ title: "Собор" });
    h.tx.slideDeck.aggregate.mockResolvedValue({ _count: 2, _max: { sortOrder: 4 } });
    h.tx.slideDeck.create.mockResolvedValue(deckRow([]));

    expect(await apply()).toMatchObject({ ok: true });
    expect(h.tx.slideDeck.create.mock.calls[0][0].data).toMatchObject({ campaignId: "camp", title: "Собор", scenarioPageId: "p", sortOrder: 5 });
  });

  it("повний набір → 409", async () => {
    h.tx.aiProposal.findFirst.mockResolvedValue(proposal("d1"));
    h.tx.slideDeck.findFirst.mockResolvedValue(deckRow(stored(MAX_SLIDES_PER_DECK)));

    expect(await apply()).toEqual({ ok: false, status: 409, error: API_ERRORS.DECK_SLIDES_LIMIT });
    expect(h.tx.aiProposal.updateMany).toHaveBeenLastCalledWith({ where: { id: "pr" }, data: { status: "pending" } });
  });

  it("набір видалено → stale", async () => {
    h.tx.aiProposal.findFirst.mockResolvedValue(proposal("d1"));
    h.tx.slideDeck.findFirst.mockResolvedValue(null);

    expect(await apply()).toEqual({ ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_STALE_DECK });
    expect(h.tx.aiProposal.update).toHaveBeenCalledWith({ where: { id: "pr" }, data: { status: "stale" } });
  });

  it("повторне застосування → 409", async () => {
    h.tx.aiProposal.findFirst.mockResolvedValue(proposal("d1", "applied"));

    expect(await apply()).toEqual({ ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_DONE });
    expect(h.tx.aiProposal.updateMany).not.toHaveBeenCalled();
    expect(h.tx.slideDeck.updateMany).not.toHaveBeenCalled();
  });

  it("addSlide разом зі сценарними операціями → 400", async () => {
    h.tx.aiProposal.findFirst.mockResolvedValue({ ...proposal("d1"), ops: [...proposal("d1").ops, { op: "renameSection", sectionId: "s", title: "t", before: { title: "x" } }] });

    expect(await apply()).toEqual({ ok: false, status: 400, error: API_ERRORS.AI_PROPOSAL_INVALID });
  });
});

describe("rejectProposal addSlide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.tx.aiProposal.updateMany.mockResolvedValue({ count: 1 });
    h.tx.aiProposal.findUnique.mockResolvedValue({ ...proposal("d1", "rejected"), threadId: null, summary: "s", appliedVersion: null, createdAt: new Date() });
  });

  it("видаляє згенерований файл, якщо його немає в наборах", async () => {
    h.tx.slideDeck.findMany.mockResolvedValue([]);

    const { rejectProposal } = await import("@/lib/ai/proposals");

    await rejectProposal("camp", "pr");
    expect(h.remove).toHaveBeenCalledWith("camp", [slide.imageUrl]);
  });

  it("не видаляє файл, що використовує набір", async () => {
    h.tx.slideDeck.findMany.mockResolvedValue([{ slides: [slide] }]);

    const { rejectProposal } = await import("@/lib/ai/proposals");

    await rejectProposal("camp", "pr");
    expect(h.remove).toHaveBeenCalledWith("camp", []);
  });
});
