import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const tx = { worldMarker: { aggregate: vi.fn(), create: vi.fn() } };

  return { tx, lockWorldMap: vi.fn(), transaction: vi.fn(), aggregateOutside: vi.fn(), createOutside: vi.fn() };
});

vi.mock("@/lib/db", () => ({
  prisma: { $transaction: m.transaction, worldMarker: { aggregate: m.aggregateOutside, create: m.createOutside } },
}));
vi.mock("@/lib/server/world/lock", () => ({ lockWorldMap: m.lockWorldMap }));
vi.mock("@/lib/server/world/map-handlers", () => ({ ownedMap: vi.fn().mockResolvedValue({ id: "map1" }) }));
vi.mock("@/lib/server/world/map-store", () => ({ toWorldMarker: (v: unknown) => v }));
vi.mock("@/lib/server/world/world-events", () => ({ publishWorldChanged: vi.fn() }));
vi.mock("@/lib/utils/api/as-dm", async () => {
  const { handleApiError } = await import("@/lib/utils/api/error-handler");

  return { withDM: async (_c: string, action: string, run: () => Promise<NextResponse>) => run().catch((e) => handleApiError(e, { action })) };
});

import { createWorldMarkerHandler } from "../marker-handlers";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_MARKERS_PER_MAP } from "@/lib/constants/world";

const req = () =>
  new Request("http://localhost/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mapId: "map1", kind: "point", x: 0.1, y: 0.2, name: "A" }),
  });

describe("createWorldMarkerHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.transaction.mockImplementation((fn: (tx: typeof m.tx) => unknown) => fn(m.tx));
    m.tx.worldMarker.aggregate.mockResolvedValue({ _count: 2, _max: { sortOrder: 4 } });
    m.tx.worldMarker.create.mockImplementation(({ data }: { data: unknown }) => Promise.resolve(data));
  });

  it("locks the map and counts inside one transaction", async () => {
    const res = await createWorldMarkerHandler(req(), "c1");

    expect(res.status).toBe(201);
    expect(m.lockWorldMap).toHaveBeenCalledWith(m.tx, "map1");
    expect(m.lockWorldMap.mock.invocationCallOrder[0]).toBeLessThan(m.tx.worldMarker.aggregate.mock.invocationCallOrder[0]);
    expect(m.tx.worldMarker.create.mock.calls[0][0].data.sortOrder).toBe(5);
    expect(m.aggregateOutside).not.toHaveBeenCalled();
  });

  it("answers 409 at the limit without creating", async () => {
    m.tx.worldMarker.aggregate.mockResolvedValue({ _count: MAX_MARKERS_PER_MAP, _max: { sortOrder: 9 } });

    const res = await createWorldMarkerHandler(req(), "c1");

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(API_ERRORS.WORLD_MARKERS_LIMIT);
    expect(m.tx.worldMarker.create).not.toHaveBeenCalled();
  });
});
