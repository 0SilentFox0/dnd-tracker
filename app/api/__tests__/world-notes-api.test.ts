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
    character: { findMany: vi.fn() },
    worldMap: { findMany: vi.fn(), findUnique: vi.fn() },
    worldMarker: { findUnique: vi.fn() },
    worldPosition: { findMany: vi.fn() },
    worldReveal: { findMany: vi.fn() },
    worldNote: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
  },
}));

const dm = { userId: "dm", isDM: true, campaign: { id: "c1", maxLevel: 20, members: [] } } as never;

const player = { userId: "u1", isDM: false, campaign: { id: "c1", maxLevel: 20, members: [] } } as never;

const notes = () => import("@/app/api/campaigns/[id]/world/notes/route");

const mapById = () => import("@/app/api/campaigns/[id]/world/maps/[mapId]/route");

const noteById = () => import("@/app/api/campaigns/[id]/world/notes/[noteId]/route");

const ctx = <T extends Record<string, string> = Record<never, never>>(extra?: T) => ({ params: Promise.resolve({ id: "c1", ...extra } as { id: string } & T) });

const json = (method: string, body?: unknown) => new Request("http://x", { method, body: body === undefined ? undefined : JSON.stringify(body) });

const mapRow = {
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
};

const markerRow = (id: string, x: number, y: number) => ({ id, mapId: "m1", kind: "point", x, y, polygon: null, name: id, icon: null, color: null, dmNote: null, alwaysVisible: false, sortOrder: 0, map: { campaignId: "c1" }, childMap: null });

const noteRow = (over: Record<string, unknown> = {}) => ({
  id: "n1",
  markerId: "near",
  authorUserId: "u2",
  characterId: null,
  visibility: "public",
  text: "t",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  author: { displayName: "A" },
  marker: { mapId: "m1", map: { campaignId: "c1" } },
  ...over,
});

describe("world notes API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(player);
    vi.mocked(prisma.worldMarker.findUnique).mockImplementation((async ({ where }: { where: { id: string } }) => (where.id === "near" ? markerRow("near", 0.5, 0.5) : markerRow("far", 0.9, 0.9))) as never);
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "h1", name: "H", avatar: null }] as never);
    vi.mocked(prisma.worldMap.findMany).mockResolvedValue([mapRow] as never);
    vi.mocked(prisma.worldMap.findUnique).mockResolvedValue({ ...mapRow, markers: [markerRow("near", 0.5, 0.5), markerRow("far", 0.9, 0.9)] } as never);
    vi.mocked(prisma.worldPosition.findMany).mockResolvedValue([{ characterId: "h1", mapId: "m1", x: 0.5, y: 0.5 }] as never);
    vi.mocked(prisma.worldReveal.findMany).mockResolvedValue([{ mapId: "m1", characterId: "h1", shape: { t: "p", x: 0.5, y: 0.5 } }] as never);
    vi.mocked(prisma.worldNote.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => noteRow({ ...data, authorUserId: data.authorUserId })) as never);
  });

  describe("POST", () => {
    const body = (over: Record<string, unknown> = {}) => ({ markerId: "near", text: "привіт", visibility: "private", ...over });

    it("публічна нотатка шле world-changed, приватна — ні", async () => {
      await (await notes()).POST(json("POST", body()), ctx());
      expect(publishWorldChanged).not.toHaveBeenCalled();

      await (await notes()).POST(json("POST", body({ visibility: "public" })), ctx());
      expect(publishWorldChanged).toHaveBeenCalledExactlyOnceWith("c1", "m1");
    });

    it("гравець: нотатка до видимого маркера — 201, mine", async () => {
      const res = await (await notes()).POST(json("POST", body({ characterId: "h1" })), ctx());

      expect(res.status).toBe(201);
      expect((await res.json()).mine).toBe(true);
      expect(vi.mocked(prisma.worldNote.create).mock.calls[0][0].data).toMatchObject({ authorUserId: "u1", characterId: "h1", visibility: "private" });
    });

    it("нотатка до невидимого маркера — 403", async () => {
      const res = await (await notes()).POST(json("POST", body({ markerId: "far" })), ctx());

      expect(res.status).toBe(403);
      expect(prisma.worldNote.create).not.toHaveBeenCalled();
    });

    it("чужий герой у characterId — 403", async () => {
      expect((await (await notes()).POST(json("POST", body({ characterId: "h2" })), ctx())).status).toBe(403);
    });

    it("text > WORLD_NOTE_MAX — 400", async () => {
      expect((await (await notes()).POST(json("POST", body({ text: "x".repeat(2001) })), ctx())).status).toBe(400);
    });

    it("ДМ пише лише public", async () => {
      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(dm);

      expect((await (await notes()).POST(json("POST", body()), ctx())).status).toBe(403);
      expect((await (await notes()).POST(json("POST", body({ markerId: "far", visibility: "public" })), ctx())).status).toBe(201);
    });
  });

  describe("PATCH / DELETE", () => {
    it("зміна приватної нотатки не шле подію, публічної — шле; видалення так само", async () => {
      vi.mocked(prisma.worldNote.findUnique).mockResolvedValue(noteRow({ authorUserId: "u1", visibility: "private" }) as never);
      vi.mocked(prisma.worldNote.update).mockResolvedValue(noteRow({ authorUserId: "u1", visibility: "private" }) as never);

      await (await noteById()).PATCH(json("PATCH", { text: "a" }), ctx({ noteId: "n1" }));
      await (await noteById()).DELETE(json("DELETE"), ctx({ noteId: "n1" }));
      expect(publishWorldChanged).not.toHaveBeenCalled();

      vi.mocked(prisma.worldNote.findUnique).mockResolvedValue(noteRow({ authorUserId: "u1", visibility: "public" }) as never);
      await (await noteById()).DELETE(json("DELETE"), ctx({ noteId: "n1" }));
      expect(publishWorldChanged).toHaveBeenCalledExactlyOnceWith("c1", "m1");
    });

    it("чужа приватна — 404 на PATCH і DELETE", async () => {
      vi.mocked(prisma.worldNote.findUnique).mockResolvedValue(noteRow({ visibility: "private" }) as never);

      expect((await (await noteById()).PATCH(json("PATCH", { text: "x" }), ctx({ noteId: "n1" }))).status).toBe(404);
      expect((await (await noteById()).DELETE(json("DELETE"), ctx({ noteId: "n1" }))).status).toBe(404);

      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(dm);

      expect((await (await noteById()).DELETE(json("DELETE"), ctx({ noteId: "n1" }))).status).toBe(404);
      expect(prisma.worldNote.delete).not.toHaveBeenCalled();
    });

    it("власну редагує й видаляє", async () => {
      vi.mocked(prisma.worldNote.findUnique).mockResolvedValue(noteRow({ authorUserId: "u1" }) as never);
      vi.mocked(prisma.worldNote.update).mockResolvedValue(noteRow({ authorUserId: "u1", text: "new" }) as never);

      const res = await (await noteById()).PATCH(json("PATCH", { text: "new" }), ctx({ noteId: "n1" }));

      expect(res.status).toBe(200);
      expect((await res.json()).text).toBe("new");
      expect((await (await noteById()).DELETE(json("DELETE"), ctx({ noteId: "n1" }))).status).toBe(200);
    });

    it("чужу публічну: гравець — 403, ДМ видаляє, але не редагує", async () => {
      vi.mocked(prisma.worldNote.findUnique).mockResolvedValue(noteRow() as never);

      expect((await (await noteById()).DELETE(json("DELETE"), ctx({ noteId: "n1" }))).status).toBe(403);

      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(dm);

      expect((await (await noteById()).PATCH(json("PATCH", { text: "x" }), ctx({ noteId: "n1" }))).status).toBe(403);
      expect((await (await noteById()).DELETE(json("DELETE"), ctx({ noteId: "n1" }))).status).toBe(200);
      expect(prisma.worldNote.delete).toHaveBeenCalledTimes(1);
    });

    it("нотатка іншої кампанії і неіснуюча — 404", async () => {
      vi.mocked(prisma.worldNote.findUnique).mockResolvedValueOnce(noteRow({ marker: { map: { campaignId: "other" } } }) as never);

      expect((await (await noteById()).DELETE(json("DELETE"), ctx({ noteId: "n1" }))).status).toBe(404);

      vi.mocked(prisma.worldNote.findUnique).mockResolvedValueOnce(null);

      expect((await (await noteById()).DELETE(json("DELETE"), ctx({ noteId: "n1" }))).status).toBe(404);
    });
  });

  describe("GET map as DM", () => {
    it("віддає лише публічні нотатки: приватні гравця не потрапляють у запит", async () => {
      vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
      vi.mocked(prisma.worldNote.findMany).mockResolvedValue([noteRow()] as never);

      const res = await (await mapById()).GET(json("GET"), ctx({ mapId: "m1" }));

      const body = await res.json();

      expect(prisma.worldNote.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { marker: { mapId: "m1" }, visibility: "public" } }));
      expect(body.notes).toHaveLength(1);
      expect(body.notes[0].visibility).toBe("public");
    });
  });
});
