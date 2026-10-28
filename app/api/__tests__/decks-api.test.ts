import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as imageStorage from "@/lib/supabase/image-storage";
import * as storage from "@/lib/supabase/scene-slide-storage";
import * as apiAuth from "@/lib/utils/api/api-auth";

const trigger = vi.hoisted(() => vi.fn(async () => undefined));

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>);

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (cb: () => unknown) => afterCallbacks.push(cb) }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger } }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/supabase/scene-slide-storage", () => ({ removeSlideFiles: vi.fn(async () => undefined), createSlideUploadTicket: vi.fn(), ensureSlidesBucket: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/supabase/image-storage", () => ({
  isHostedOnProjectStorage: (u: string) => u.includes(".supabase.co/"),
  resolveImageForPersistence: vi.fn(async () => ({ ok: true, value: "https://p.supabase.co/storage/v1/object/public/scene-slides/c1/mirrored.png" })),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/db", async () => {
  const { contentDatabaseDouble } = await import("@/lib/server/content/__tests__/database-double");

  return { prisma: contentDatabaseDouble({
    slideDeck: { findMany: vi.fn(async () => []), findUnique: vi.fn(), findFirst: vi.fn(), aggregate: vi.fn(async () => ({ _count: 0, _max: { sortOrder: null } })), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    scenarioPage: { findFirst: vi.fn() },
    campaignShow: { findUnique: vi.fn(async () => null), updateMany: vi.fn(async () => ({ count: 1 })), createMany: vi.fn(async () => ({ count: 1 })) },
  }) };
});

const dm = { userId: "dm", isDM: true, campaign: { id: "c1", maxLevel: 20, members: [] } } as never;

const url = (n: string) => `https://p.supabase.co/storage/v1/object/public/scene-slides/c1/${n}.webp`;

const row = (slides: unknown[], over: Record<string, unknown> = {}) => ({ id: "d1", campaignId: "c1", title: "Таверна", sortOrder: 0, scenarioPageId: null, slides, createdAt: new Date(0), updatedAt: new Date(0), ...over });

const slide = (id: string, n: string, extra: Record<string, unknown> = {}) => ({ id, imageUrl: url(n), ...extra });

const EXPECTED = new Date(0).toISOString();

const put = async (body: Record<string, unknown>) => {
  const { PUT } = await import("@/app/api/campaigns/[id]/decks/[deckId]/route");

  return PUT(new Request("http://x", { method: "PUT", body: JSON.stringify({ expectedUpdatedAt: EXPECTED, ...body }) }), { params: Promise.resolve({ id: "c1", deckId: "d1" }) });
};

const deckRowWith = (over: Record<string, unknown>) => row([], over);

const patch = async (deckId: string, body: Record<string, unknown>) => {
  const { PATCH } = await import("@/app/api/campaigns/[id]/decks/[deckId]/route");

  return PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "c1", deckId }) });
};

const seedDeck = (old: ReturnType<typeof row>) => {
  vi.mocked(prisma.slideDeck.findUnique).mockReset().mockResolvedValueOnce(old as never);
  vi.mocked(prisma.slideDeck.update).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => row(data.slides as unknown[], { title: data.title, updatedAt: new Date(1) })) as never);
};

const runAfter = () => Promise.all(afterCallbacks.map((cb) => cb()));

describe("decks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
  });

  it("гравець — 403 на список, створення, збереження, квиток", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    const decks = await import("@/app/api/campaigns/[id]/decks/route");

    const ticket = await import("@/app/api/campaigns/[id]/decks/upload-url/route");

    const p = { params: Promise.resolve({ id: "c1" }) };

    expect((await decks.GET(new Request("http://x"), p)).status).toBe(403);
    expect((await decks.POST(new Request("http://x", { method: "POST", body: JSON.stringify({ title: "a" }) }), p)).status).toBe(403);
    expect((await ticket.POST(new Request("http://x", { method: "POST", body: JSON.stringify({ size: 10, contentType: "image/webp" }) }), p)).status).toBe(403);
    expect((await put({ title: "a", slides: [] })).status).toBe(403);
  });

  it("POST: ліміт наборів — 400", async () => {
    vi.mocked(prisma.slideDeck.aggregate).mockResolvedValueOnce({ _count: 100, _max: { sortOrder: 99 } } as never);

    const { POST } = await import("@/app/api/campaigns/[id]/decks/route");

    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ title: "a" }) }), { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(400);
  });

  it("PUT: чужий набір — 403", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(row([], { campaignId: "c2" }) as never);

    expect((await put({ title: "a", slides: [] })).status).toBe(403);
  });

  it("PUT: зовнішнє посилання дзеркалиться; зниклі файли стираються після відповіді, крім поточного слайда показу і картинок інших наборів", async () => {
    seedDeck(row([slide("slide-0001", "a"), slide("slide-0002", "b"), slide("slide-0003", "c"), slide("slide-0004", "d")]));
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d9", deckTitle: "Інший", slide: slide("slide-0099", "b"), nextImageUrl: null, audio: null, seq: 3 } as never);
    vi.mocked(prisma.slideDeck.findMany).mockResolvedValue([{ slides: [slide("slide-0050", "c")] }] as never);

    const res = await put({ title: "Таверна", slides: [slide("slide-0001", "a"), { id: "slide-0005", imageUrl: "https://example.com/x.png" }] });

    expect(res.status).toBe(200);

    const body = (await res.json()) as { slides: { imageUrl: string }[] };

    expect(body.slides[1].imageUrl).toBe("https://p.supabase.co/storage/v1/object/public/scene-slides/c1/mirrored.png");
    expect(storage.removeSlideFiles).not.toHaveBeenCalled();

    await runAfter();
    expect(storage.removeSlideFiles).toHaveBeenCalledWith("c1", [url("d")]);
  });

  it("PUT поточного набору: змінений поточний слайд — новий знімок і Pusher", async () => {
    seedDeck(row([slide("slide-0001", "a"), slide("slide-0002", "b")]));
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d1", deckTitle: "Таверна", slide: slide("slide-0001", "a"), nextImageUrl: url("b"), audio: null, seq: 3 } as never);

    await put({ title: "Таверна", slides: [slide("slide-0001", "a", { caption: "Ніч" }), slide("slide-0002", "b")] });

    await runAfter();

    expect(vi.mocked(prisma.campaignShow.updateMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1", seq: 3 }, data: { seq: 4 } });
    expect(trigger).toHaveBeenCalledWith("private-show-c1", "show-state", expect.objectContaining({ campaignId: "c1", show: expect.objectContaining({ seq: 4, slide: expect.objectContaining({ caption: "Ніч" }) }) }));
  });

  it("PUT: застарілий expectedUpdatedAt — 409 без запису й дзеркалювання", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(row([], { updatedAt: new Date(5) }) as never);

    const res = await put({ title: "a", slides: [{ id: "slide-0005", imageUrl: "https://example.com/x.png" }] });

    expect(res.status).toBe(409);
    expect(prisma.slideDeck.update).not.toHaveBeenCalled();
    expect(imageStorage.resolveImageForPersistence).not.toHaveBeenCalled();
    await runAfter();
    expect(storage.removeSlideFiles).not.toHaveBeenCalled();
  });

  it("PUT: набір змінили між читанням і записом — 409, файли не стираються", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(row([slide("slide-0001", "a")]) as never);
    vi.mocked(prisma.slideDeck.update).mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("not found", { code: "P2025", clientVersion: "6" }));

    const res = await put({ title: "a", slides: [] });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "Набір змінено в іншому місці — оновіть сторінку" });
    await runAfter();
    expect(storage.removeSlideFiles).not.toHaveBeenCalled();
  });

  it("PUT: конфлікт запису після дзеркалювання — 409, віддзеркалені цим запитом копії стерто до відповіді", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(row([slide("slide-0001", "a")]) as never);
    vi.mocked(prisma.slideDeck.update).mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("not found", { code: "P2025", clientVersion: "6" }));

    const res = await put({ title: "a", slides: [slide("slide-0001", "a"), { id: "slide-0005", imageUrl: "https://example.com/x.png" }] });

    expect(res.status).toBe(409);
    expect(storage.removeSlideFiles).toHaveBeenCalledExactlyOnceWith("c1", ["https://p.supabase.co/storage/v1/object/public/scene-slides/c1/mirrored.png"]);
  });

  it("PUT без слайда, що зараз на екрані: показ переходить на сусіда, файл видаленого слайда стирається", async () => {
    seedDeck(row([slide("slide-0001", "a"), slide("slide-0002", "b"), slide("slide-0003", "c")]));
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d1", deckTitle: "Таверна", slide: slide("slide-0002", "b"), nextImageUrl: url("c"), audio: null, seq: 3 } as never);

    await put({ title: "Таверна", slides: [slide("slide-0001", "a"), slide("slide-0003", "c")] });
    await runAfter();

    expect(vi.mocked(prisma.campaignShow.updateMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1", seq: 3 }, data: { deckId: "d1", slide: slide("slide-0003", "c"), nextImageUrl: null, seq: 4 } });
    expect(trigger).toHaveBeenCalledWith("private-show-c1", "show-state", expect.objectContaining({ show: expect.objectContaining({ slide: slide("slide-0003", "c"), seq: 4 }) }));
    expect(storage.removeSlideFiles).toHaveBeenCalledWith("c1", [url("b")]);
  });

  it("PUT поточного набору без слайдів: показ завершується, усі файли стираються", async () => {
    seedDeck(row([slide("slide-0001", "a"), slide("slide-0002", "b")]));
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d1", deckTitle: "Таверна", slide: slide("slide-0001", "a"), nextImageUrl: url("b"), audio: null, seq: 3 } as never);

    await put({ title: "Таверна", slides: [] });
    await runAfter();

    expect(vi.mocked(prisma.campaignShow.updateMany).mock.calls[0][0]).toMatchObject({ data: { deckId: null, nextImageUrl: null, seq: 4 } });
    expect(storage.removeSlideFiles).toHaveBeenCalledWith("c1", [url("a"), url("b")]);
  });

  it("DELETE: конфлікт seq при завершенні показу — перечитати і повторити", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(row([slide("slide-0001", "a")]) as never);

    const shown = (seq: number) => ({ deckId: "d1", deckTitle: "Таверна", slide: slide("slide-0001", "a"), nextImageUrl: null, audio: null, seq });

    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValueOnce(shown(3) as never).mockResolvedValueOnce(shown(4) as never);
    vi.mocked(prisma.campaignShow.updateMany).mockResolvedValueOnce({ count: 0 });

    const { DELETE } = await import("@/app/api/campaigns/[id]/decks/[deckId]/route");

    await DELETE(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ id: "c1", deckId: "d1" }) });
    await runAfter();

    expect(prisma.campaignShow.updateMany).toHaveBeenCalledTimes(2);
    expect(vi.mocked(prisma.campaignShow.updateMany).mock.calls[1][0]).toMatchObject({ where: { seq: 4 }, data: { deckId: null, seq: 5 } });
    expect(trigger).toHaveBeenCalledWith("private-show-c1", "show-state", expect.objectContaining({ show: expect.objectContaining({ deckId: null, seq: 5 }) }));
    expect(storage.removeSlideFiles).toHaveBeenCalledWith("c1", [url("a")]);
  });

  it("DELETE набору, що зараз у показі: показ завершується, файл екрана теж стирається", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(row([slide("slide-0001", "a"), slide("slide-0002", "b")]) as never);
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d1", deckTitle: "Таверна", slide: slide("slide-0001", "a"), nextImageUrl: url("b"), audio: null, seq: 3 } as never);

    const { DELETE } = await import("@/app/api/campaigns/[id]/decks/[deckId]/route");

    await DELETE(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ id: "c1", deckId: "d1" }) });
    await runAfter();

    expect(vi.mocked(prisma.campaignShow.updateMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1", seq: 3 }, data: { deckId: null, slide: expect.anything(), seq: 4 } });
    expect(trigger).toHaveBeenCalledWith("private-show-c1", "show-state", expect.objectContaining({ show: expect.objectContaining({ deckId: null, seq: 4 }) }));
    expect(storage.removeSlideFiles).toHaveBeenCalledWith("c1", [url("a"), url("b")]);
  });

  it("DELETE: видаляє набір і після відповіді — його файли, крім поточного слайда показу", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(row([slide("slide-0001", "a"), slide("slide-0002", "b")]) as never);
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ deckId: "d9", deckTitle: "Інший", slide: slide("slide-0001", "a"), nextImageUrl: url("b"), audio: null, seq: 3 } as never);

    const { DELETE } = await import("@/app/api/campaigns/[id]/decks/[deckId]/route");

    const res = await DELETE(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ id: "c1", deckId: "d1" }) });

    expect(res.status).toBe(200);
    expect(prisma.slideDeck.delete).toHaveBeenCalledWith({ where: { id: "d1" } });

    await runAfter();
    expect(storage.removeSlideFiles).toHaveBeenCalledWith("c1", [url("b")]);
    expect(prisma.campaignShow.updateMany).not.toHaveBeenCalled();
  });

  it("квиток: svg — 400; webp — квиток зі сховища", async () => {
    vi.mocked(storage.createSlideUploadTicket).mockResolvedValue({ ok: true, value: { bucket: "scene-slides", path: "c1/x.webp", token: "t", contentType: "image/webp", publicUrl: url("x") } });

    const { POST } = await import("@/app/api/campaigns/[id]/decks/upload-url/route");

    const p = { params: Promise.resolve({ id: "c1" }) };

    expect((await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ size: 10, contentType: "image/svg+xml" }) }), p)).status).toBe(400);

    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ size: 10, contentType: "image/webp" }) }), p);

    expect(await res.json()).toMatchObject({ path: "c1/x.webp", publicUrl: url("x") });
  });

  it("native scene bindings share the Campaign write guard", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(deckRowWith({}) as never);

    const { currentContentWrite } = await import("@/lib/server/content/write-context");

    let guarded = false;

    vi.mocked(prisma.slideDeck.update).mockImplementation((async () => { guarded = currentContentWrite()?.campaignId === "c1";

 return deckRowWith({}); }) as never);
    expect((await patch("d1", { scenarioPageId: null })).status).toBe(200);
    expect(guarded).toBe(true);
  });

  it("binding never restores an older updatedAt after waiting for the shared lock", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockReset().mockResolvedValueOnce(deckRowWith({}) as never).mockResolvedValueOnce(deckRowWith({ updatedAt: new Date(5) }) as never);
    vi.mocked(prisma.slideDeck.update).mockResolvedValue(deckRowWith({ updatedAt: new Date(5) }) as never);
    expect((await patch("d1", { scenarioPageId: null })).status).toBe(200);
    expect(vi.mocked(prisma.slideDeck.update).mock.calls[0][0]).toMatchObject({ data: { updatedAt: new Date(5) } });
  });

  it("PATCH сцени: своя сцена — зберігає, updatedAt не змінюється", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(deckRowWith({ updatedAt: new Date("2026-10-21T10:00:00Z") }) as never);
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(prisma.slideDeck.update).mockResolvedValue(deckRowWith({ scenarioPageId: "p1", updatedAt: new Date("2026-10-21T10:00:00Z") }) as never);

    const res = await patch("d1", { scenarioPageId: "p1" });

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.scenarioPage.findFirst).mock.calls[0][0]).toMatchObject({ where: { id: "p1", campaignId: "c1", kind: "scene" } });
    expect(vi.mocked(prisma.slideDeck.update).mock.calls[0][0]).toMatchObject({ data: { scenarioPageId: "p1", updatedAt: new Date("2026-10-21T10:00:00Z") } });
    expect((await res.json()).scenarioPageId).toBe("p1");
  });

  it("PATCH сцени: не сцена або чужа кампанія — 400", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(deckRowWith({}) as never);
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(null);

    expect((await patch("d1", { scenarioPageId: "hero1" })).status).toBe(400);
    expect(prisma.slideDeck.update).not.toHaveBeenCalled();
  });

  it("PATCH сцени: null відв'язує без перевірки сторінки", async () => {
    vi.mocked(prisma.slideDeck.findUnique).mockResolvedValue(deckRowWith({ scenarioPageId: "p1" }) as never);
    vi.mocked(prisma.slideDeck.update).mockResolvedValue(deckRowWith({ scenarioPageId: null }) as never);

    expect((await patch("d1", { scenarioPageId: null })).status).toBe(200);
    expect(prisma.scenarioPage.findFirst).not.toHaveBeenCalled();
  });
});
