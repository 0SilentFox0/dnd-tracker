import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as storage from "@/lib/supabase/battle-music-storage";
import * as apiAuth from "@/lib/utils/api/api-auth";
import * as oembed from "@/lib/utils/audio/youtube-oembed";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/supabase/battle-music-storage", async (orig) => ({
  ...(await orig<typeof storage>()),
  createTrackUploadTicket: vi.fn(),
  verifyUploadedTrack: vi.fn(),
  removeTrackFile: vi.fn(),
}));
vi.mock("@/lib/utils/audio/youtube-oembed", () => ({ fetchYoutubeTitle: vi.fn(async () => null) }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (cb: () => unknown) => cb() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    campaignTrack: { count: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), aggregate: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

const dm = { userId: "dm", isDM: true, campaign: { id: "camp1", maxLevel: 20, members: [] } } as never;

const PATH = "camp1/0123456789abcdef0123456789abcdef.mp3";

const row = (over: Record<string, unknown> = {}) => ({
  id: "t1", campaignId: "camp1", title: "Бій", kind: "file", url: "https://s/battle-music/x.mp3", youtubeId: null, durationSec: 120, sortOrder: 0, createdAt: new Date("2026-10-19T00:00:00Z"), ...over,
});

const req = (method: string, body?: unknown) => new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const params = (extra: Record<string, string> = {}) => ({ params: Promise.resolve({ id: "camp1", ...extra }) }) as never;

async function tracksRoute() {
  return import("@/app/api/campaigns/[id]/tracks/route");
}

describe("tracks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.campaignTrack.count).mockResolvedValue(3);
    vi.mocked(prisma.campaignTrack.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.campaignTrack.aggregate).mockResolvedValue({ _max: { sortOrder: 2 } } as never);
    vi.mocked(prisma.campaignTrack.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => row({ ...data, id: "new" })) as never);
    vi.mocked(storage.verifyUploadedTrack).mockResolvedValue({ ok: true, value: "https://s/battle-music/x.mp3" });
  });

  it("не ДМ — 403 і без запису", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "forbidden" }, { status: 403 }) as never);

    const { POST } = await tracksRoute();

    expect((await POST(req("POST", { kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }), params())).status).toBe(403);
    expect(prisma.campaignTrack.create).not.toHaveBeenCalled();
  });

  it("файл: перевірений шлях кампанії → 201, url зі Storage, sortOrder у кінець", async () => {
    const { POST } = await tracksRoute();

    const res = await POST(req("POST", { kind: "file", path: PATH, title: "  Бій  ", durationSec: 120 }), params());

    expect(res.status).toBe(201);
    expect(prisma.campaignTrack.create).toHaveBeenCalledWith({
      data: { campaignId: "camp1", kind: "file", title: "Бій", url: "https://s/battle-music/x.mp3", youtubeId: null, durationSec: 120, sortOrder: 3 },
    });
    expect(await res.json()).toMatchObject({ id: "new", kind: "file", createdAt: "2026-10-19T00:00:00.000Z" });
  });

  it("файл: шлях іншої кампанії або неперевірений обʼєкт — 400 без запису", async () => {
    const { POST } = await tracksRoute();

    expect((await POST(req("POST", { kind: "file", path: PATH.replace("camp1", "camp2"), title: "x" }), params())).status).toBe(400);
    expect(storage.verifyUploadedTrack).not.toHaveBeenCalled();

    vi.mocked(storage.verifyUploadedTrack).mockResolvedValue({ ok: false, message: "Потрібен файл MP3 або M4A до 10 МБ" });
    expect((await POST(req("POST", { kind: "file", path: PATH, title: "x" }), params())).status).toBe(400);
    expect(prisma.campaignTrack.create).not.toHaveBeenCalled();
  });

  it("файл: шлях, уже зареєстрований у бібліотеці, — 400 без другого рядка (видалення одного зламало б інший)", async () => {
    vi.mocked(prisma.campaignTrack.findFirst).mockResolvedValue(row() as never);

    const { POST } = await tracksRoute();

    const res = await POST(req("POST", { kind: "file", path: PATH, title: "x" }), params());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Цей файл уже є в бібліотеці" });
    expect(prisma.campaignTrack.findFirst).toHaveBeenCalledWith({ where: { campaignId: "camp1", url: "https://s/battle-music/x.mp3" }, select: { id: true } });
    expect(prisma.campaignTrack.create).not.toHaveBeenCalled();
  });

  it("YouTube: id з посилання, назва ДМ або oEmbed, інакше «YouTube <id>»", async () => {
    const { POST } = await tracksRoute();

    await POST(req("POST", { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Таверна" }), params());
    expect(prisma.campaignTrack.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ kind: "youtube", youtubeId: "dQw4w9WgXcQ", title: "Таверна", url: null }) });
    expect(oembed.fetchYoutubeTitle).not.toHaveBeenCalled();

    vi.mocked(oembed.fetchYoutubeTitle).mockResolvedValueOnce("Epic Battle");
    await POST(req("POST", { kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }), params());
    expect(prisma.campaignTrack.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ title: "Epic Battle" }) });

    await POST(req("POST", { kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }), params());
    expect(prisma.campaignTrack.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ title: "YouTube dQw4w9WgXcQ" }) });
  });

  it("ліміт 200: і квиток, і створення відмовляють", async () => {
    vi.mocked(prisma.campaignTrack.count).mockResolvedValue(200);

    const { POST } = await tracksRoute();

    const { POST: ticket } = await import("@/app/api/campaigns/[id]/tracks/upload-url/route");

    const created = await POST(req("POST", { kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }), params());

    expect(created.status).toBe(400);
    expect(await created.json()).toEqual({ error: "У бібліотеці вже 200 треків — видаліть зайві" });
    expect((await ticket(req("POST", { name: "a.mp3", size: 100, contentType: "audio/mpeg" }), params())).status).toBe(400);
    expect(storage.createTrackUploadTicket).not.toHaveBeenCalled();
  });

  it("квиток: перевіряє тип і розмір, видає підписаний шлях", async () => {
    vi.mocked(storage.createTrackUploadTicket).mockResolvedValue({ ok: true, value: { bucket: "battle-music", path: PATH, token: "tok", contentType: "audio/mpeg" } });

    const { POST: ticket } = await import("@/app/api/campaigns/[id]/tracks/upload-url/route");

    expect((await ticket(req("POST", { name: "a.ogg", size: 100, contentType: "audio/ogg" }), params())).status).toBe(400);

    const ok = await ticket(req("POST", { name: "a.mp3", size: 100, contentType: "audio/mpeg" }), params());

    expect(await ok.json()).toEqual({ bucket: "battle-music", path: PATH, token: "tok", contentType: "audio/mpeg" });
    expect(storage.createTrackUploadTicket).toHaveBeenCalledWith("camp1", "mp3");
  });

  it("DELETE: трек іншої кампанії — 403; свій файл — запис і обʼєкт Storage", async () => {
    const { DELETE } = await import("@/app/api/campaigns/[id]/tracks/[trackId]/route");

    vi.mocked(prisma.campaignTrack.findUnique).mockResolvedValueOnce(row({ campaignId: "other" }) as never);
    expect((await DELETE(req("DELETE"), params({ trackId: "t1" }))).status).toBe(403);

    vi.mocked(prisma.campaignTrack.findUnique).mockResolvedValueOnce(row() as never);

    const res = await DELETE(req("DELETE"), params({ trackId: "t1" }));

    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.campaignTrack.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
    expect(storage.removeTrackFile).toHaveBeenCalledWith("https://s/battle-music/x.mp3");
  });

  it("PATCH перейменовує", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/tracks/[trackId]/route");

    vi.mocked(prisma.campaignTrack.findUnique).mockResolvedValueOnce(row() as never);
    vi.mocked(prisma.campaignTrack.update).mockResolvedValueOnce(row({ title: "Нова" }) as never);

    const res = await PATCH(req("PATCH", { title: " Нова " }), params({ trackId: "t1" }));

    expect(prisma.campaignTrack.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { title: "Нова" } });
    expect(await res.json()).toMatchObject({ title: "Нова" });
  });

  it("PATCH змінює посилання YouTube й тривалість; для файлу посилання заборонене; порожній запит — 400", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/tracks/[trackId]/route");

    vi.mocked(prisma.campaignTrack.findUnique).mockResolvedValue(row({ kind: "youtube", url: null, youtubeId: "oldVideoId_1" }) as never);
    vi.mocked(prisma.campaignTrack.update).mockResolvedValue(row() as never);

    expect((await PATCH(req("PATCH", { url: "https://youtu.be/dQw4w9WgXcQ", durationSec: null }), params({ trackId: "t1" }))).status).toBe(200);
    expect(prisma.campaignTrack.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { youtubeId: "dQw4w9WgXcQ", durationSec: null } });

    expect((await PATCH(req("PATCH", {}), params({ trackId: "t1" }))).status).toBe(400);
    expect((await PATCH(req("PATCH", { url: "https://example.com" }), params({ trackId: "t1" }))).status).toBe(400);

    vi.mocked(prisma.campaignTrack.findUnique).mockResolvedValue(row() as never);
    vi.mocked(prisma.campaignTrack.update).mockClear();

    expect((await PATCH(req("PATCH", { url: "https://youtu.be/dQw4w9WgXcQ" }), params({ trackId: "t1" }))).status).toBe(400);
    expect(prisma.campaignTrack.update).not.toHaveBeenCalled();
  });

  it("PUT order: лише повний набір треків кампанії", async () => {
    const { PUT } = await import("@/app/api/campaigns/[id]/tracks/order/route");

    vi.mocked(prisma.campaignTrack.findMany).mockResolvedValue([row({ id: "a" }), row({ id: "b" })] as never);

    expect((await PUT(req("PUT", { ids: ["a"] }), params())).status).toBe(400);
    expect((await PUT(req("PUT", { ids: ["a", "x"] }), params())).status).toBe(400);
    expect((await PUT(req("PUT", { ids: ["a", "a"] }), params())).status).toBe(400);

    await PUT(req("PUT", { ids: ["b", "a"] }), params());

    expect(prisma.campaignTrack.update).toHaveBeenCalledWith({ where: { id: "b" }, data: { sortOrder: 0 } });
    expect(prisma.campaignTrack.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { sortOrder: 1 } });
  });
});
