import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { publishWorldChanged } from "@/lib/server/world/world-events";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/world/world-events", () => ({ publishWorldChanged: vi.fn() }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/supabase/world-map-storage", () => ({ ownedWorldMapPath: vi.fn(), removeWorldMapFiles: vi.fn(), createWorldMapUploadTicket: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
    character: { findMany: vi.fn() },
    worldMap: { findMany: vi.fn(), findUnique: vi.fn() },
    worldMarker: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    worldPosition: { findMany: vi.fn(), upsert: vi.fn(async (a: unknown) => a) },
    worldReveal: { findMany: vi.fn(), createMany: vi.fn(async (a: unknown) => a) },
    worldTravelLog: { create: vi.fn(async (a: unknown) => a), findMany: vi.fn() },
    worldNote: { findMany: vi.fn() },
    campaignShow: { findUnique: vi.fn() },
  },
}));

const dm = { userId: "dm", isDM: true, campaign: { id: "c1", maxLevel: 20, members: [] } } as never;

const player = { userId: "u1", isDM: false, campaign: { id: "c1", maxLevel: 20, members: [] } } as never;

const ctx = () => ({ params: Promise.resolve({ id: "c1" }) });

const post = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });

const get = (qs = "") => new Request(`http://x/api/view${qs}`);

const mapRow = (over: Record<string, unknown> = {}) => ({
  id: "m1",
  campaignId: "c1",
  parentMarkerId: null,
  name: "Світ",
  imageUrl: "u",
  width: 100,
  height: 100,
  fogEnabled: true,
  revealRadius: 0.1,
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
  y: 0.1,
  polygon: null,
  name: "Замок",
  icon: null,
  color: null,
  dmNote: "таємниця",
  alwaysVisible: false,
  sortOrder: 0,
  map: { campaignId: "c1" },
  childMap: null,
  ...over,
});

const hero = (id: string) => ({ id, name: `Hero ${id}`, avatar: null });

const routes = {
  travel: () => import("@/app/api/campaigns/[id]/world/travel/route"),
  enter: () => import("@/app/api/campaigns/[id]/world/enter/route"),
  exit: () => import("@/app/api/campaigns/[id]/world/exit/route"),
  view: () => import("@/app/api/campaigns/[id]/world/view/route"),
  log: () => import("@/app/api/campaigns/[id]/world/log/route"),
};

const route = <K extends keyof typeof routes>(name: K): ReturnType<(typeof routes)[K]> => routes[name]() as ReturnType<(typeof routes)[K]>;

const txOps = () => vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown as unknown[];

describe("world travel API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((async (ops: unknown[]) => Promise.all(ops)) as never);
    vi.mocked(prisma.worldPosition.upsert).mockImplementation(((a: unknown) => a) as never);
    vi.mocked(prisma.worldReveal.createMany).mockImplementation(((a: unknown) => a) as never);
    vi.mocked(prisma.worldTravelLog.create).mockImplementation(((a: unknown) => a) as never);
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(dm);
    vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([]);
    vi.mocked(prisma.worldReveal.findMany).mockResolvedValue([]);
    vi.mocked(prisma.worldMap.findMany).mockResolvedValue([mapRow()] as never);
    vi.mocked(prisma.worldMap.findUnique).mockResolvedValue(mapRow() as never);
    vi.mocked(prisma.character.findMany).mockResolvedValue([hero("h1")] as never);
  });

  describe("POST travel", () => {
    const body = (over: Record<string, unknown> = {}) => ({ mapId: "m1", characterIds: ["h1"], to: { x: 0.5, y: 0.5 }, rest: "none", ...over });

    it("гравець — 403", async () => {
      vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

      expect((await (await route("travel")).POST(post(body()), ctx())).status).toBe(403);
    });

    it("не-свій герой / герой іншої кампанії — 400", async () => {
      vi.mocked(prisma.character.findMany).mockResolvedValue([]);

      const res = await (await route("travel")).POST(post(body()), ctx());

      expect(res.status).toBe(400);
      expect(vi.mocked(prisma.character.findMany).mock.calls[0][0]?.where).toMatchObject({ campaignId: "c1", type: "player", status: "active" });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("перший візит — одна p, відповідь з позиціями", async () => {
      const res = await (await route("travel")).POST(post(body()), ctx());

      expect(res.status).toBe(200);
      expect(publishWorldChanged).toHaveBeenCalledExactlyOnceWith("c1", "m1");
      expect((await res.json()).positions).toEqual([{ id: "h1", name: "Hero h1", avatar: null, mapId: "m1", x: 0.5, y: 0.5, own: true }]);
      expect(vi.mocked(prisma.worldReveal.createMany).mock.calls[0][0]?.data).toEqual([{ mapId: "m1", characterId: "h1", shape: { t: "p", x: 0.5, y: 0.5 } }]);
      expect(vi.mocked(prisma.worldTravelLog.create).mock.calls[0][0]?.data).toMatchObject({ mapId: "m1", from: undefined, to: { mapId: "m1", x: 0.5, y: 0.5 }, byUserId: "dm", rest: "none" });
    });

    it("другий візит на тій же карті — відрізок s, з поправкою from", async () => {
      vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([{ characterId: "h1", mapId: "m1", x: 0.2, y: 0.2 }] as never);

      await (await route("travel")).POST(post(body({ rest: "short" })), ctx());

      expect(vi.mocked(prisma.worldReveal.createMany).mock.calls[0][0]?.data).toEqual([{ mapId: "m1", characterId: "h1", shape: { t: "s", x1: 0.2, y1: 0.2, x2: 0.5, y2: 0.5 } }]);
      expect(vi.mocked(prisma.worldTravelLog.create).mock.calls[0][0]?.data).toMatchObject({ from: { mapId: "m1", x: 0.2, y: 0.2 }, rest: "short" });
    });

    it("прихід на вже відкриту точку з іншої карти не дублює p", async () => {
      vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([{ characterId: "h1", mapId: "other", x: 0.2, y: 0.2 }] as never);
      vi.mocked(prisma.worldReveal.findMany).mockResolvedValue([{ characterId: "h1", shape: { t: "p", x: 0.5, y: 0.5 } }] as never);

      await (await route("travel")).POST(post(body()), ctx());

      expect(vi.mocked(prisma.worldReveal.createMany).mock.calls[0][0]?.data).toEqual([]);
      expect(prisma.worldPosition.upsert).toHaveBeenCalledTimes(1);
    });

    it("поблизу, але не в тій самій точці — p додається", async () => {
      vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([{ characterId: "h1", mapId: "other", x: 0.2, y: 0.2 }] as never);
      vi.mocked(prisma.worldReveal.findMany).mockResolvedValue([{ characterId: "h1", shape: { t: "p", x: 0.52, y: 0.5 } }] as never);

      await (await route("travel")).POST(post(body()), ctx());

      expect(vi.mocked(prisma.worldReveal.createMany).mock.calls[0][0]?.data).toEqual([{ mapId: "m1", characterId: "h1", shape: { t: "p", x: 0.5, y: 0.5 } }]);
    });

    it("нульовий відрізок (герой уже в точці) — p, яка дедуплікується", async () => {
      vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([{ characterId: "h1", mapId: "m1", x: 0.5, y: 0.5 }] as never);
      vi.mocked(prisma.worldReveal.findMany).mockResolvedValue([{ characterId: "h1", shape: { t: "p", x: 0.5, y: 0.5 } }] as never);

      await (await route("travel")).POST(post(body()), ctx());

      expect(vi.mocked(prisma.worldReveal.createMany).mock.calls[0][0]?.data).toEqual([]);
    });

    it("toMarkerId з іншої карти ігнорується", async () => {
      vi.mocked(prisma.worldMarker.findFirst).mockResolvedValue(null);

      await (await route("travel")).POST(post(body({ toMarkerId: "k9" })), ctx());

      expect(vi.mocked(prisma.worldTravelLog.create).mock.calls[0][0]?.data.toMarkerId).toBeNull();
    });

    it("усе пишеться одним $transaction; збій — 500", async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error("log failed"));

      const res = await (await route("travel")).POST(post(body()), ctx());

      expect(res.status).toBe(500);
      expect(txOps()).toHaveLength(3);
    });
  });

  describe("POST enter", () => {
    it("маркер без вкладеної карти — 409", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow() as never);

      expect((await (await route("enter")).POST(post({ markerId: "k1", characterIds: ["h1"], rest: "none" }), ctx())).status).toBe(409);
    });

    it("переносить на вкладену карту в entry, лог з from", async () => {
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow({ childMap: { id: "m2" } }) as never);
      vi.mocked(prisma.worldMap.findUnique).mockResolvedValue(mapRow({ id: "m2", entryX: 0.3, entryY: 0.4 }) as never);
      vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([{ characterId: "h1", mapId: "m1", x: 0.1, y: 0.1 }] as never);

      const res = await (await route("enter")).POST(post({ markerId: "k1", characterIds: ["h1"], rest: "none" }), ctx());

      expect(res.status).toBe(200);
      expect(publishWorldChanged).toHaveBeenCalledExactlyOnceWith("c1", "m2");
      expect(vi.mocked(prisma.worldPosition.upsert).mock.calls[0][0]?.update).toEqual({ mapId: "m2", x: 0.3, y: 0.4 });
      expect(vi.mocked(prisma.worldTravelLog.create).mock.calls[0][0]?.data).toMatchObject({ mapId: "m2", from: { mapId: "m1", x: 0.1, y: 0.1 }, to: { mapId: "m2", x: 0.3, y: 0.4 } });
    });
  });

  describe("POST exit", () => {
    it("з кореня — 409", async () => {
      expect((await (await route("exit")).POST(post({ mapId: "m1", characterIds: ["h1"], rest: "none" }), ctx())).status).toBe(409);
    });

    it("герой не на цій карті — 400; інакше на маркер входу батьківської", async () => {
      vi.mocked(prisma.worldMap.findUnique).mockImplementation((async ({ where }: { where: { id: string } }) =>
        where.id === "m2" ? mapRow({ id: "m2", parentMarkerId: "k1" }) : mapRow()) as never);
      vi.mocked(prisma.worldMarker.findUnique).mockResolvedValue(markerRow() as never);

      const body = { mapId: "m2", characterIds: ["h1"], rest: "none" };

      expect((await (await route("exit")).POST(post(body), ctx())).status).toBe(400);

      vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([{ characterId: "h1", mapId: "m2", x: 0.9, y: 0.9 }] as never);

      const res = await (await route("exit")).POST(post(body), ctx());

      expect(res.status).toBe(200);
      expect(publishWorldChanged).toHaveBeenCalledExactlyOnceWith("c1", "m1");
      expect(vi.mocked(prisma.worldPosition.upsert).mock.calls[0][0]?.update).toEqual({ mapId: "m1", x: 0.1, y: 0.1 });
    });
  });

  describe("GET view", () => {
    beforeEach(() => {
      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(player);
      vi.mocked(prisma.worldMap.findUnique).mockResolvedValue({ ...mapRow(), markers: [markerRow({ childMap: null }), markerRow({ id: "k2", x: 0.9, y: 0.9 })] } as never);
      vi.mocked(prisma.worldNote.findMany).mockResolvedValue([]);
    });

    it("asHeroId від гравця — 403", async () => {
      expect((await (await route("view")).GET(get("?asHeroId=h1"), ctx())).status).toBe(403);
    });

    it("ДМ без asHeroId — 400", async () => {
      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(dm);

      expect((await (await route("view")).GET(get(), ctx())).status).toBe(400);
    });

    it("mapId, якого нема в кампанії або не дозволений, — 404", async () => {
      vi.mocked(prisma.character.findMany).mockResolvedValue([hero("h1")] as never);

      expect((await (await route("view")).GET(get("?mapId=foreign"), ctx())).status).toBe(404);
    });

    describe("показана карта", () => {
      const m2 = () => mapRow({ id: "m2", name: "Підземелля", parentMarkerId: "k1", parentMarker: { mapId: "m1" } });

      beforeEach(() => {
        vi.mocked(prisma.character.findMany).mockResolvedValue([]);
        vi.mocked(prisma.worldMap.findMany).mockResolvedValue([mapRow(), m2()] as never);
        vi.mocked(prisma.worldMap.findUnique).mockResolvedValue({ ...m2(), markers: [markerRow({ id: "k5", mapId: "m2", alwaysVisible: true })] } as never);
        vi.mocked(prisma.worldNote.findMany).mockResolvedValue([]);
      });

      it("невідома карта без показу — 404", async () => {
        vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue(null);

        expect((await (await route("view")).GET(get("?mapId=m2"), ctx())).status).toBe(404);
      });

      it("показана карта — 200 з туманом, без героїв і dmNote", async () => {
        vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ world: { mapId: "m2" } } as never);

        const res = await (await route("view")).GET(get("?mapId=m2"), ctx());

        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.heroes).toEqual([]);
        expect(body.reveals).toEqual([]);
        expect(body.markers.every((m: { dmNote: unknown }) => m.dmNote === null)).toBe(true);
      });

      it("після worldOff (world: null) — знову 404", async () => {
        vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ world: null } as never);

        expect((await (await route("view")).GET(get("?mapId=m2"), ctx())).status).toBe(404);
      });

      it("asHeroId гравцю — все одно 403", async () => {
        vi.mocked(prisma.campaignShow.findUnique).mockResolvedValue({ world: { mapId: "m2" } } as never);

        expect((await (await route("view")).GET(get("?mapId=m2&asHeroId=h1"), ctx())).status).toBe(403);
      });
    });

    it("гравець без героїв — порожній туман на корені, без dmNote", async () => {
      vi.mocked(prisma.character.findMany).mockResolvedValue([]);

      const res = await (await route("view")).GET(get(), ctx());

      expect(res.status).toBe(200);
      expect((await res.json()).markers).toEqual([]);
    });

    it("відкритий маркер без dmNote, чужий герой поза відкритим не повертається", async () => {
      vi.mocked(prisma.character.findMany).mockImplementation((async ({ where }: { where: { controlledBy?: string; id?: { in: string[] } } }) =>
        where.controlledBy
          ? [hero("h1")]
          : [
              { id: "h1", name: "Own", avatar: null, controlledBy: "u1" },
              { id: "h2", name: "Other", avatar: null, controlledBy: "u2" },
            ]) as never);
      vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([
        { characterId: "h1", mapId: "m1", x: 0.1, y: 0.1 },
        { characterId: "h2", mapId: "m1", x: 0.9, y: 0.9 },
      ] as never);
      vi.mocked(prisma.worldReveal.findMany).mockResolvedValue([{ mapId: "m1", characterId: "h1", shape: { t: "p", x: 0.1, y: 0.1 } }] as never);

      const body = await (await (await route("view")).GET(get(), ctx())).json();

      expect(body.markers.map((m: { id: string }) => m.id)).toEqual(["k1"]);
      expect(body.markers[0].dmNote).toBeNull();
      expect(body.heroes.map((h: { id: string }) => h.id)).toEqual(["h1"]);
    });

    it("герої з позиціями читаються лише активні гравці кампанії", async () => {
      vi.mocked(prisma.character.findMany).mockResolvedValue([hero("h1")] as never);
      vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([{ characterId: "h1", mapId: "m1", x: 0.1, y: 0.1 }] as never);

      await (await route("view")).GET(get(), ctx());

      for (const [arg] of vi.mocked(prisma.character.findMany).mock.calls) expect(arg?.where).toMatchObject({ campaignId: "c1", type: "player", status: "active" });
    });

    it("ДМ «очима героя»: власні приватні нотатки ДМ не в вигляді", async () => {
      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(dm);
      vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "h1", name: "Own", avatar: null, controlledBy: "u1" }] as never);
      vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([{ characterId: "h1", mapId: "m1", x: 0.1, y: 0.1 }] as never);
      vi.mocked(prisma.worldReveal.findMany).mockResolvedValue([{ mapId: "m1", characterId: "h1", shape: { t: "p", x: 0.1, y: 0.1 } }] as never);
      vi.mocked(prisma.worldNote.findMany).mockResolvedValue([
        { id: "n1", markerId: "k1", authorUserId: "dm", characterId: null, visibility: "public", text: "a", createdAt: new Date(0), updatedAt: new Date(0), author: { displayName: "DM" } },
        { id: "n2", markerId: "k1", authorUserId: "dm", characterId: null, visibility: "private", text: "b", createdAt: new Date(0), updatedAt: new Date(0), author: { displayName: "DM" } },
      ] as never);

      const body = await (await (await route("view")).GET(get("?asHeroId=h1"), ctx())).json();

      expect(vi.mocked(prisma.worldNote.findMany).mock.calls[0][0]?.where).toMatchObject({ visibility: "public" });
      expect(body.notes.map((n: { id: string }) => n.id)).toEqual(["n1"]);
    });
  });

  describe("GET log", () => {
    const entry = { id: "l1", mapId: "m1", characterIds: ["h1", "h2"], from: null, to: { mapId: "m1", x: 0.5, y: 0.5 }, toMarkerId: null, rest: "none", createdAt: new Date(0) };

    it("гравець: фільтр по своїх героях, чужі імена не віддаються", async () => {
      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(player);
      vi.mocked(prisma.character.findMany).mockImplementation((async ({ where }: { where: { controlledBy?: string } }) => (where.controlledBy ? [hero("h1")] : [hero("h1")])) as never);
      vi.mocked(prisma.worldTravelLog.findMany).mockResolvedValue([entry] as never);
      vi.mocked(prisma.worldMarker.findMany).mockResolvedValue([]);

      const res = await (await route("log")).GET(get(), ctx());

      expect(vi.mocked(prisma.worldTravelLog.findMany).mock.calls[0][0]?.where).toMatchObject({ campaignId: "c1", characterIds: { hasSome: ["h1"] } });
      expect((await res.json())[0].heroes).toEqual([{ id: "h1", name: "Hero h1" }]);
    });

    it("гравець не бачить координат `from`, ДМ бачить", async () => {
      const withFrom = { ...entry, from: { mapId: "m1", x: 0.9, y: 0.9 } };

      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(player);
      vi.mocked(prisma.character.findMany).mockResolvedValue([hero("h1")] as never);
      vi.mocked(prisma.worldTravelLog.findMany).mockResolvedValue([withFrom] as never);
      vi.mocked(prisma.worldMarker.findMany).mockResolvedValue([]);

      expect((await (await (await route("log")).GET(get(), ctx())).json())[0].from).toBeNull();

      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(dm);

      expect((await (await (await route("log")).GET(get(), ctx())).json())[0].from).toEqual(withFrom.from);
    });

    it("ДМ: без фільтра по героях, take = TRAVEL_LOG_LIMIT", async () => {
      vi.mocked(prisma.worldTravelLog.findMany).mockResolvedValue([]);

      const res = await (await route("log")).GET(get(), ctx());

      expect(await res.json()).toEqual([]);
      expect(vi.mocked(prisma.worldTravelLog.findMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "c1" }, take: 50, orderBy: { createdAt: "desc" } });
    });
  });
});
