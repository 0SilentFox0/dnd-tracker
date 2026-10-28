import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentError } from "@/lib/server/content/errors";

const m = vi.hoisted(() => ({
  applyWorldRest: vi.fn(),
  writeRestLog: vi.fn(),
  commitTravel: vi.fn(),
  readPositions: vi.fn(),
  activePlayerHeroes: vi.fn(),
  publishWorldChanged: vi.fn(),
  ownedMap: vi.fn(),
  findMarker: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { worldMarker: { findFirst: m.findMarker } } }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(async () => ({ userId: "u1", campaign: { id: "c1" } })), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/server/world/rest", () => ({ applyWorldRest: m.applyWorldRest }));
vi.mock("@/lib/server/world/world-events", () => ({ publishWorldChanged: m.publishWorldChanged }));
vi.mock("@/lib/server/world/map-handlers", () => ({ ownedMap: m.ownedMap, ownedMarker: vi.fn() }));
vi.mock("@/lib/server/world/travel-store", () => ({
  activePlayerHeroes: m.activePlayerHeroes,
  commitTravel: m.commitTravel,
  readPositions: m.readPositions,
  readTravelLog: vi.fn(),
  toDmHeroes: vi.fn(() => []),
  writeRestLog: m.writeRestLog,
}));

import { restHandler, travelHandler } from "../travel-handlers";

const req = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

const map = { id: "m1", revealRadius: 0.1, width: 100, height: 100 };

beforeEach(() => {
  vi.clearAllMocks();
  m.ownedMap.mockResolvedValue(map);
  m.activePlayerHeroes.mockResolvedValue([{ id: "h1", name: "A", avatar: null }]);
  m.readPositions.mockResolvedValue(new Map([["h1", { characterId: "h1", mapId: "m1", x: 0.3, y: 0.4 }]]));
  m.applyWorldRest.mockResolvedValue({ applied: true });
  m.findMarker.mockResolvedValue(null);
});

describe("restHandler", () => {
  const body = { mapId: "m1", characterIds: ["h1"], kind: "long" };

  it("пише журнал і сповіщає, коли відпочинок застосовано", async () => {
    const res = await restHandler(req(body), "c1");

    expect(await res.json()).toEqual({ ok: true, applied: true });
    expect(m.writeRestLog).toHaveBeenCalledWith({ campaignId: "c1", userId: "u1", mapId: "m1", kind: "long", characterIds: ["h1"], at: { x: 0.3, y: 0.4 } });
    expect(m.publishWorldChanged).toHaveBeenCalledWith("c1", "m1");
  });

  it("нічого не пише, коли відпочинок не застосовано", async () => {
    m.applyWorldRest.mockResolvedValue({ applied: false });

    const res = await restHandler(req(body), "c1");

    expect(await res.json()).toEqual({ ok: true, applied: false });
    expect(m.writeRestLog).not.toHaveBeenCalled();
    expect(m.publishWorldChanged).not.toHaveBeenCalled();
  });

  it("400, коли герой не на цій мапі", async () => {
    m.readPositions.mockResolvedValue(new Map([["h1", { characterId: "h1", mapId: "other", x: 0, y: 0 }]]));

    const res = await restHandler(req(body), "c1");

    expect(res.status).toBe(400);
    expect(m.applyWorldRest).not.toHaveBeenCalled();
  });
});

describe("travelHandler rest", () => {
  const travel = (rest: string) => req({ mapId: "m1", characterIds: ["h1"], to: { x: 0.5, y: 0.5 }, rest });

  it("відпочиває до commitTravel", async () => {
    await travelHandler(travel("long"), "c1");

    expect(m.applyWorldRest).toHaveBeenCalledWith(expect.anything(), "long", ["h1"]);
    expect(m.applyWorldRest.mock.invocationCallOrder[0]).toBeLessThan(m.commitTravel.mock.invocationCallOrder[0]);
  });

  it("передає rest none в applyWorldRest", async () => {
    await travelHandler(travel("none"), "c1");

    expect(m.applyWorldRest).toHaveBeenCalledWith(expect.anything(), "none", ["h1"]);
    expect(m.commitTravel).toHaveBeenCalled();
  });

  it("409 від відпочинку скасовує перехід", async () => {
    m.applyWorldRest.mockRejectedValue(new ContentError("busy", 409));

    const res = await travelHandler(travel("short"), "c1");

    expect(res.status).toBe(409);
    expect(m.commitTravel).not.toHaveBeenCalled();
  });
});
