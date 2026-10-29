import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { publishWorldChanged } from "@/lib/server/world/world-events";
import * as storage from "@/lib/supabase/world-map-storage";
import * as apiAuth from "@/lib/utils/api/api-auth";

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/world/world-events", () => ({ publishWorldChanged: vi.fn() }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (cb: () => unknown) => afterCallbacks.push(cb) }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/supabase/world-map-storage", () => ({
  ownedWorldMapPath: vi.fn((campaignId: string, url: string) => (url.includes(`/world-maps/${campaignId}/`) ? url : null)),
  removeWorldMapFiles: vi.fn(async () => undefined),
  createWorldMapUploadTicket: vi.fn(),
}));
vi.mock("@/lib/db", () => {
  const prisma: Record<string, unknown> = {
    $executeRaw: vi.fn(async () => 1),
    $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
    worldMap: { findMany: vi.fn(async () => []), findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn(async () => 0), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    worldPosition: { findMany: vi.fn(async () => []) },
    worldNote: { findMany: vi.fn() },
    campaignShow: { findUnique: vi.fn(async () => null), updateMany: vi.fn(async () => ({ count: 1 })) },
    worldMarker: { findUnique: vi.fn(), findMany: vi.fn(async () => []), aggregate: vi.fn(async () => ({ _count: 0, _max: { sortOrder: null } })), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  };

  return { prisma };
});

const dm = { userId: "dm", isDM: true, campaign: { id: "c1", maxLevel: 20, members: [] } } as never;

const img = (n: string, campaign = "c1") => `https://p.supabase.co/storage/v1/object/public/world-maps/${campaign}/${n}.webp`;

const mapRow = (over: Record<string, unknown> = {}) => ({
  id: "m1",
  campaignId: "c1",
  parentMarkerId: null,
  name: "Світ",
  imageUrl: img("a"),
  width: 100,
  height: 100,
  fogEnabled: true,
  revealRadius: 0.04,
  entryX: 0.5,
  entryY: 0.5,
  updatedAt: new Date(0),
  parentMarker: null,
  ...over,
});

const markerRow = (over: Record<string, unknown> = {}) => ({
  id: "k1",
  mapId: "m1",
  kind: "point",
  x: 0.1,
  y: 0.2,
  polygon: null,
  name: "Замок",
  icon: null,
  color: null,
  dmNote: null,
  alwaysVisible: false,
  sortOrder: 0,
  map: { campaignId: "c1" },
  childMap: null,
  ...over,
});

const ctx = <T extends Record<string, string> = Record<never, never>>(extra?: T) => ({ params: Promise.resolve({ id: "c1", ...extra } as { id: string } & T) });

const json = (method: string, body?: unknown) => new Request("http://x", { method, body: body === undefined ? undefined : JSON.stringify(body) });

const runAfter = () => Promise.all(afterCallbacks.map((cb) => cb()));

const maps = () => import("@/app/api/campaigns/[id]/world/maps/route");

const mapById = () => import("@/app/api/campaigns/[id]/world/maps/[mapId]/route");

const markers = () => import("@/app/api/campaigns/[id]/world/markers/route");

const markerById = () => import("@/app/api/campaigns/[id]/world/markers/[markerId]/route");

describe("world API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    afterCallbacks.length = 0;
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(storage.ownedWorldMapPath).mockImplementation(((campaignId: string, url: string) => (url.includes(`/world-maps/${campaignId}/`) ? url : null)) as never);
    vi.mocked(prisma.worldMap.findMany).mockResolvedValue([]);
    vi.mocked(prisma.worldMap.count).mockResolvedValue(0);
    vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([]);
    vi.mocked(prisma.worldMarker.findMany).mockResolvedValue([]);
    vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.campaignShow.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.worldMarker.aggregate).mockResolvedValue({ _count: 0, _max: { sortOrder: null } } as never);
  });

  it("не-ДМ — 403 на кожен метод", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    const m = await maps();

    const mi = await mapById();

    const k = await markers();

    const ki = await markerById();

    const results = await Promise.all([
      m.GET(json("GET"), ctx()),
      m.POST(json("POST", {}), ctx()),
      mi.GET(json("GET"), ctx({ mapId: "m1" })),
      mi.PATCH(json("PATCH", {}), ctx({ mapId: "m1" })),
      mi.DELETE(json("DELETE"), ctx({ mapId: "m1" })),
      k.POST(json("POST", {}), ctx()),
      ki.PATCH(json("PATCH", {}), ctx({ markerId: "k1" })),
      ki.DELETE(json("DELETE"), ctx({ markerId: "k1" })),
    ]);

    expect(results.map((r) => r.status)).toEqual(Array(8).fill(403));
  });

  it("карта іншої кампанії — 403, неіснуюча — 404", async () => {
    const mi = await mapById();

    vi.mocked(prisma.worldMap.findUnique).mockResolvedValueOnce(mapRow({ campaignId: "other" }) as never);
    expect((await mi.GET(json("GET"), ctx({ mapId: "m1" }))).status).toBe(403);

    vi.mocked(prisma.worldMap.findUnique).mockResolvedValueOnce(null);
    expect((await mi.GET(json("GET"), ctx({ mapId: "m1" }))).status).toBe(404);
  });

  it("GET карти віддає heroes (порожній список без позицій)", async () => {
    vi.mocked(prisma.worldNote.findMany).mockResolvedValue([]);
    vi.mocked(prisma.worldMap.findUnique).mockResolvedValue(mapRow({ markers: [] }) as never);

    const res = await (await mapById()).GET(json("GET"), ctx({ mapId: "m1" }));

    expect((await res.json()).heroes).toEqual([]);
  });

  it("GET списку віддає DTO з parentMapId", async () => {
    vi.mocked(prisma.worldMap.findMany).mockResolvedValue([mapRow(), mapRow({ id: "m2", parentMarkerId: "k1", parentMarker: { mapId: "m1" } })] as never);

    const res = await (await maps()).GET(json("GET"), ctx());

    const body = await res.json();

    expect(body.map((m: { parentMapId: string | null }) => m.parentMapId)).toEqual([null, "m1"]);
  });

  describe("POST map", () => {
    const body = (over: Record<string, unknown> = {}) => ({ name: "Світ", imageUrl: img("a"), width: 100, height: 100, ...over });

    it("коренева: 201", async () => {
      vi.mocked(prisma.worldMap.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.worldMap.create).mockResolvedValue(mapRow() as never);

      const res = await (await maps()).POST(json("POST", body()), ctx());

      expect(res.status).toBe(201);
      expect((await res.json()).updatedAt).toBe(new Date(0).toISOString());
    });

    it("друга коренева — 409", async () => {
      vi.mocked(prisma.worldMap.findFirst).mockResolvedValue({ id: "m1" } as never);

      expect((await (await maps()).POST(json("POST", body()), ctx())).status).toBe(409);
      expect(prisma.worldMap.create).not.toHaveBeenCalled();
    });

    it("чужий imageUrl — 400", async () => {
      expect((await (await maps()).POST(json("POST", body({ imageUrl: "https://evil.example/x.webp" })), ctx())).status).toBe(400);
      expect((await (await maps()).POST(json("POST", body({ imageUrl: img("a", "c2") })), ctx())).status).toBe(400);
    });

    it("ліміт карт — 409", async () => {
      vi.mocked(prisma.worldMap.count).mockResolvedValue(200);

      expect((await (await maps()).POST(json("POST", body()), ctx())).status).toBe(409);
    });

    it("вкладена до маркера з childMap — 409", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow({ childMap: { id: "m2" } }) as never);

      expect((await (await maps()).POST(json("POST", body({ parentMarkerId: "k1" })), ctx())).status).toBe(409);
    });

    it("вкладена до маркера чужої кампанії — 403", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow({ map: { campaignId: "other" } }) as never);

      expect((await (await maps()).POST(json("POST", body({ parentMarkerId: "k1" })), ctx())).status).toBe(403);
    });

    it("вкладена: 201, гонка P2002 — 409", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow() as never);
      vi.mocked(prisma.worldMap.create).mockResolvedValueOnce(mapRow({ id: "m2", parentMarkerId: "k1", parentMarker: { mapId: "m1" } }) as never);

      const res = await (await maps()).POST(json("POST", body({ parentMarkerId: "k1" })), ctx());

      expect(res.status).toBe(201);
      expect(vi.mocked(prisma.worldMap.create).mock.calls[0][0].data).toMatchObject({ campaignId: "c1", parentMarkerId: "k1" });

      const { Prisma } = await import("@prisma/client");

      vi.mocked(prisma.worldMap.create).mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }));

      expect((await (await maps()).POST(json("POST", body({ parentMarkerId: "k1" })), ctx())).status).toBe(409);
    });
  });

  describe("POST map: race on the root", () => {
    it("P2002 без parentMarkerId — 409 про корінь", async () => {
      const { Prisma } = await import("@prisma/client");

      vi.mocked(prisma.worldMap.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.worldMap.create).mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }));

      const res = await (await maps()).POST(json("POST", { name: "Світ", imageUrl: img("a"), width: 100, height: 100 }), ctx());

      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe(API_ERRORS.WORLD_ROOT_EXISTS);
    });
  });

  describe("POST discard-upload", () => {
    const discard = () => import("@/app/api/campaigns/[id]/world/discard-upload/route");

    it("видаляє файл, на який не посилається жодна карта", async () => {
      expect((await (await discard()).POST(json("POST", { imageUrl: img("z") }), ctx())).status).toBe(200);
      expect(storage.removeWorldMapFiles).toHaveBeenCalledWith("c1", [img("z")]);
    });

    it("не чіпає файл, який використовує карта", async () => {
      vi.mocked(prisma.worldMap.count).mockResolvedValue(1);

      expect((await (await discard()).POST(json("POST", { imageUrl: img("a") }), ctx())).status).toBe(200);
      expect(storage.removeWorldMapFiles).not.toHaveBeenCalled();
    });

    it("чужий шлях — 400", async () => {
      expect((await (await discard()).POST(json("POST", { imageUrl: "https://x/world-maps/other/a.webp" }), ctx())).status).toBe(400);
      expect(storage.removeWorldMapFiles).not.toHaveBeenCalled();
    });
  });

  describe("PATCH map", () => {
    it("зміна imageUrl — старий файл видаляється в after", async () => {
      vi.mocked(prisma.worldMap.findUnique).mockResolvedValue(mapRow() as never);
      vi.mocked(prisma.worldMap.update).mockResolvedValue(mapRow({ imageUrl: img("b") }) as never);

      const res = await (await mapById()).PATCH(json("PATCH", { imageUrl: img("b") }), ctx({ mapId: "m1" }));

      expect(res.status).toBe(200);
      expect(storage.removeWorldMapFiles).not.toHaveBeenCalled();

      await runAfter();

      expect(storage.removeWorldMapFiles).toHaveBeenCalledWith("c1", [img("a")]);
    });

    it("старий файл ще на іншій карті — не видаляється", async () => {
      vi.mocked(prisma.worldMap.findUnique).mockResolvedValue(mapRow() as never);
      vi.mocked(prisma.worldMap.update).mockResolvedValue(mapRow({ imageUrl: img("b") }) as never);
      vi.mocked(prisma.worldMap.count).mockResolvedValue(1);

      await (await mapById()).PATCH(json("PATCH", { imageUrl: img("b") }), ctx({ mapId: "m1" }));
      await runAfter();

      expect(storage.removeWorldMapFiles).not.toHaveBeenCalled();
    });

    it("чужий imageUrl — 400", async () => {
      vi.mocked(prisma.worldMap.findUnique).mockResolvedValue(mapRow() as never);

      expect((await (await mapById()).PATCH(json("PATCH", { imageUrl: "https://evil.example/x.webp" }), ctx({ mapId: "m1" }))).status).toBe(400);
    });
  });

  describe("POST marker", () => {
    beforeEach(() => {
      vi.mocked(prisma.worldMap.findUnique).mockResolvedValue(mapRow() as never);
      vi.mocked(prisma.worldMarker.create).mockResolvedValue(markerRow() as never);
    });

    it("зона: x/y — центроїд, колір за замовчуванням, sortOrder max+1", async () => {
      vi.mocked(prisma.worldMarker.aggregate).mockResolvedValue({ _count: 2, _max: { sortOrder: 4 } } as never);

      const polygon = [[0, 0], [0.4, 0], [0.4, 0.4], [0, 0.4], [0, 0]];

      const res = await (await markers()).POST(json("POST", { mapId: "m1", kind: "zone", x: 0.9, y: 0.9, polygon, name: "Ліс" }), ctx());

      expect(res.status).toBe(201);

      const { data } = vi.mocked(prisma.worldMarker.create).mock.calls[0][0];

      expect(data.x).toBeCloseTo(0.2);
      expect(data.y).toBeCloseTo(0.2);
      expect(data.color).toBe("#d3b060");
      expect(data.sortOrder).toBe(5);
      expect(publishWorldChanged).toHaveBeenCalledExactlyOnceWith("c1", "m1");
    });

    it("ліміт маркерів — 409", async () => {
      vi.mocked(prisma.worldMarker.aggregate).mockResolvedValue({ _count: 300, _max: { sortOrder: 299 } } as never);

      expect((await (await markers()).POST(json("POST", { mapId: "m1", kind: "point", x: 0.1, y: 0.1, name: "A" }), ctx())).status).toBe(409);
    });

    it("карта чужої кампанії — 403", async () => {
      vi.mocked(prisma.worldMap.findUnique).mockResolvedValue(mapRow({ campaignId: "other" }) as never);

      expect((await (await markers()).POST(json("POST", { mapId: "m1", kind: "point", x: 0.1, y: 0.1, name: "A" }), ctx())).status).toBe(403);
    });
  });

  describe("PATCH marker", () => {
    const square = [[0.2, 0.2], [0.6, 0.2], [0.6, 0.6], [0.2, 0.6], [0.2, 0.2]];

    it("polygon перераховує центроїд, x/y з тіла ігноруються", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow({ kind: "zone", polygon: square }) as never);
      vi.mocked(prisma.worldMarker.update).mockResolvedValue(markerRow({ kind: "zone" }) as never);

      const res = await (await markerById()).PATCH(json("PATCH", { polygon: square, x: 0.9 }), ctx({ markerId: "k1" }));

      expect(res.status).toBe(200);

      const { data } = vi.mocked(prisma.worldMarker.update).mock.calls[0][0];

      expect(data.x).toBeCloseTo(0.4);
      expect(data.y).toBeCloseTo(0.4);
    });

    it("точка + polygon — 400", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow() as never);

      expect((await (await markerById()).PATCH(json("PATCH", { polygon: square }), ctx({ markerId: "k1" }))).status).toBe(400);
      expect(prisma.worldMarker.update).not.toHaveBeenCalled();
    });

    it("маркер іншої кампанії — 403", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow({ map: { campaignId: "other" } }) as never);

      expect((await (await markerById()).PATCH(json("PATCH", { name: "B" }), ctx({ markerId: "k1" }))).status).toBe(403);
    });
  });

  describe("DELETE", () => {
    const tree = [
      { id: "m1", imageUrl: img("root"), parentMarker: null },
      { id: "m2", imageUrl: img("shared"), parentMarker: { mapId: "m1" } },
      { id: "m3", imageUrl: img("deep"), parentMarker: { mapId: "m2" } },
      { id: "m4", imageUrl: img("shared"), parentMarker: { mapId: "m1" } },
    ];

    it("маркер із вкладеною картою: у Storage лише orphaned URL піддерева", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow({ childMap: { id: "m2" } }) as never);
      vi.mocked(prisma.worldMap.findMany).mockResolvedValue(tree as never);
      vi.mocked(prisma.worldMarker.delete).mockResolvedValue(markerRow() as never);

      const res = await (await markerById()).DELETE(json("DELETE"), ctx({ markerId: "k1" }));

      expect(res.status).toBe(200);
      expect(prisma.worldMarker.delete).toHaveBeenCalledWith({ where: { id: "k1" } });

      await runAfter();

      expect(storage.removeWorldMapFiles).toHaveBeenCalledWith("c1", [img("deep")]);
    });

    it("маркер без вкладеної карти — Storage не чіпаємо", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow() as never);
      vi.mocked(prisma.worldMarker.delete).mockResolvedValue(markerRow() as never);

      await (await markerById()).DELETE(json("DELETE"), ctx({ markerId: "k1" }));
      await runAfter();

      expect(storage.removeWorldMapFiles).not.toHaveBeenCalled();
    });

    it("карта: каскад і файли піддерева без тих, що лишаються поза ним", async () => {
      vi.mocked(prisma.worldMap.findUnique).mockResolvedValue(mapRow({ id: "m2" }) as never);
      vi.mocked(prisma.worldMap.findMany).mockResolvedValue(tree as never);
      vi.mocked(prisma.worldMap.delete).mockResolvedValue(mapRow() as never);

      const res = await (await mapById()).DELETE(json("DELETE"), ctx({ mapId: "m2" }));

      expect(res.status).toBe(200);

      await runAfter();

      expect(storage.removeWorldMapFiles).toHaveBeenCalledWith("c1", [img("deep")]);
    });

    const shown = (world: unknown) => ({ deckId: null, deckTitle: null, slide: null, nextImageUrl: null, audio: null, battle: null, cover: null, curtain: false, world, seq: 3 });

    it("карта: показана карта з піддерева знімає world", async () => {
      vi.mocked(prisma.worldMap.findUnique).mockResolvedValue(mapRow({ id: "m2" }) as never);
      vi.mocked(prisma.worldMap.findMany).mockResolvedValue(tree as never);
      vi.mocked(prisma.worldMap.delete).mockResolvedValue(mapRow() as never);
      vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(shown({ mapId: "m3" }) as never);

      await (await mapById()).DELETE(json("DELETE"), ctx({ mapId: "m2" }));
      await runAfter();

      expect(publishWorldChanged).toHaveBeenCalledExactlyOnceWith("c1", null);
      expect(vi.mocked(prisma.campaignShow.updateMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1", seq: 3 }, data: { seq: 4 } });
      expect(vi.mocked(prisma.campaignShow.updateMany).mock.calls[0][0].data).toHaveProperty("world");
    });

    it("маркер: фокус-маркер знімає лише focusMarkerId", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow() as never);
      vi.mocked(prisma.worldMarker.delete).mockResolvedValue(markerRow() as never);
      vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(shown({ mapId: "m1", focusMarkerId: "k1" }) as never);

      await (await markerById()).DELETE(json("DELETE"), ctx({ markerId: "k1" }));
      await runAfter();

      expect(publishWorldChanged).toHaveBeenCalledExactlyOnceWith("c1", "m1");
      expect(vi.mocked(prisma.campaignShow.updateMany).mock.calls[0][0]).toMatchObject({ data: { world: { mapId: "m1" }, seq: 4 } });
    });

    it("інша показана карта — показ не чіпаємо", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow() as never);
      vi.mocked(prisma.worldMarker.delete).mockResolvedValue(markerRow() as never);
      vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(shown({ mapId: "m9", focusMarkerId: "k9" }) as never);

      await (await markerById()).DELETE(json("DELETE"), ctx({ markerId: "k1" }));
      await runAfter();

      expect(prisma.campaignShow.updateMany).not.toHaveBeenCalled();
    });

    it("збій видалення рядка — файли не чіпаємо", async () => {
      vi.mocked(prisma.worldMap.findUnique).mockResolvedValue(mapRow({ id: "m2" }) as never);
      vi.mocked(prisma.worldMap.findMany).mockResolvedValue(tree as never);
      vi.mocked(prisma.worldMap.delete).mockRejectedValue(new Error("db"));

      expect((await (await mapById()).DELETE(json("DELETE"), ctx({ mapId: "m2" }))).status).toBe(500);

      await runAfter();

      expect(storage.removeWorldMapFiles).not.toHaveBeenCalled();
    });
  });
});
