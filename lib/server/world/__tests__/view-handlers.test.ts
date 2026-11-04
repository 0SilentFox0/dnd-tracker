import { beforeEach, describe, expect, it, vi } from "vitest";

import { viewHandler } from "../view-handlers";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  listMaps: vi.fn(),
  detail: vi.fn(),
  heroes: vi.fn(),
  positions: vi.fn(),
  reveals: vi.fn(),
  show: vi.fn(),
  notes: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: {
  worldPosition: { findMany: mocks.positions },
  worldReveal: { findMany: mocks.reveals },
  campaignShow: { findUnique: mocks.show },
  worldNote: { findMany: mocks.notes },
} }));
vi.mock("@/lib/server/world/map-store", () => ({ listWorldMaps: mocks.listMaps, readWorldMapDetail: mocks.detail }));
vi.mock("@/lib/server/world/travel-store", () => ({ activePlayerHeroes: mocks.heroes }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: mocks.access }));

const root = { id: "root", name: "Root", parentMarkerId: null, parentMapId: null, imageUrl: "/root.svg", width: 100, height: 100, fogEnabled: false, revealRadius: 0.1, entryX: 0.5, entryY: 0.5, updatedAt: "" };

const child = { id: "child", name: "Child", parentMarkerId: "marker", parentMapId: "root", imageUrl: "/child.svg", width: 100, height: 100, fogEnabled: false, revealRadius: 0.1, entryX: 0.5, entryY: 0.5, updatedAt: "" };

describe("world view Demo access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ userId: "u1", isDM: false, isDemo: true });
    mocks.listMaps.mockResolvedValue([root, child]);
    mocks.positions.mockResolvedValue([]);
    mocks.reveals.mockResolvedValue([]);
    mocks.heroes.mockResolvedValue([]);
    mocks.show.mockResolvedValue(null);
    mocks.notes.mockResolvedValue([]);
    mocks.detail.mockResolvedValue({ map: child, markers: [] });
  });

  it("lets Demo open a child map and returns the full campaign map list", async () => {
    const response = await viewHandler(new Request("http://localhost/api/campaigns/demo/world/view?mapId=child"), "demo");

    expect(response.status).toBe(200);
    expect(mocks.detail).toHaveBeenCalledWith("child");
    expect((await response.json()).maps.map((map: { id: string }) => map.id)).toEqual(["root", "child"]);
  });
});

describe("world view asParty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listMaps.mockResolvedValue([root, child]);
    mocks.positions.mockResolvedValue([]);
    mocks.reveals.mockResolvedValue([]);
    mocks.heroes.mockResolvedValue([{ id: "h1", name: "A", avatar: null, controlledBy: null }, { id: "h2", name: "B", avatar: null, controlledBy: null }]);
    mocks.show.mockResolvedValue(null);
    mocks.notes.mockResolvedValue([]);
    mocks.detail.mockResolvedValue({ map: root, markers: [] });
  });

  const call = () => viewHandler(new Request("http://localhost/api/campaigns/c/world/view?mapId=root&asParty=1"), "c");

  it("builds one view from the reveals of every active hero for the DM", async () => {
    mocks.access.mockResolvedValue({ userId: "u1", isDM: true, isDemo: false });

    const response = await call();

    expect(response.status).toBe(200);
    expect(mocks.heroes).toHaveBeenCalledWith("c", {});
    expect(mocks.reveals).toHaveBeenCalledWith(expect.objectContaining({ where: { characterId: { in: ["h1", "h2"] } } }));
  });

  it("is DM only", async () => {
    mocks.access.mockResolvedValue({ userId: "u1", isDM: false, isDemo: false });

    expect((await call()).status).toBe(403);
  });
});
