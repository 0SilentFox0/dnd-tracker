import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ findLogs: vi.fn(), findChars: vi.fn(), findMarkers: vi.fn(), listWorldMaps: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { worldTravelLog: { findMany: m.findLogs }, character: { findMany: m.findChars }, worldMarker: { findMany: m.findMarkers } } }));
vi.mock("@/lib/server/world/map-store", () => ({ listWorldMaps: m.listWorldMaps }));

import { readTravelLog } from "../travel-store";

beforeEach(() => {
  vi.clearAllMocks();
  m.findChars.mockResolvedValue([{ id: "h1", name: "Aria" }, { id: "h2", name: "Borin" }]);
  m.findMarkers.mockResolvedValue([]);
  m.listWorldMaps.mockResolvedValue([{ id: "m1", name: "World" }]);
});

describe("readTravelLog", () => {
  const row = { id: "r1", mapId: "m1", characterIds: ["h1", "h2"], from: { mapId: "m1", x: 0, y: 0 }, to: { mapId: "m1", x: 0.3, y: 0.4 }, toMarkerId: null, rest: "long", kind: "rest", createdAt: new Date(0) };

  it("rest entry for a player: only own heroes, from is null", async () => {
    m.findLogs.mockResolvedValue([row]);

    const [entry] = await readTravelLog("c1", 10, ["h1"]);

    expect(entry).toMatchObject({ kind: "rest", rest: "long", from: null, heroes: [{ id: "h1", name: "Aria" }] });
    expect(m.findLogs.mock.calls[0][0].where).toEqual({ campaignId: "c1", characterIds: { hasSome: ["h1"] } });
  });

  it("rest entry for the DM keeps every hero and from", async () => {
    m.findLogs.mockResolvedValue([row]);

    const [entry] = await readTravelLog("c1", 10);

    expect(entry.heroes).toHaveLength(2);
    expect(entry.from).toEqual(row.from);
  });
});
