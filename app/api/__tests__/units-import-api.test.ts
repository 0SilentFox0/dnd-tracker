import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

const db = vi.hoisted(() => ({
  race: { findMany: vi.fn() },
  unit: { findMany: vi.fn(), createMany: vi.fn() },
}));

const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(async () => ({ userId: "dm" })) }));

import { POST } from "@/app/api/campaigns/[id]/units/import/route";

const post = (body: unknown) =>
  POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "c1" }) }) as Promise<NextResponse>;

describe("POST units/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.race.findMany.mockResolvedValue([{ id: "r1", name: "Гобліни" }]);
    db.unit.findMany.mockResolvedValue([]);
    db.unit.createMany.mockImplementation(async ({ data }: { data: unknown[] }) => ({ count: data.length }));
  });

  it("звіт з невідомими расами, атаки з усіма полями, інвалідує units", async () => {
    const attack = { name: "Лук", type: "ranged", targetType: "aoe", attackBonus: 4, damageType: "piercing", damageDice: "1d6", maxTargets: 2, damageDistribution: [60, 40], guaranteedDamage: 1 };

    const res = await post({ units: [{ name: "Лучник", raceName: "гобліни", attacks: [attack] }, { name: "Привид", raceName: "Нежить" }] });

    expect(res.status).toBe(200);
    expect(await getResponseJson(res)).toEqual({ imported: 2, total: 2, skipped: 0, unknownRaces: ["Нежить"] });
    expect(db.unit.createMany.mock.calls[0][0].data[0]).toMatchObject({ raceId: "r1", attacks: [attack] });
    expect(revalidateTag).toHaveBeenCalledWith("units-c1", { expire: 0 });
  });

  it("невалідний avatar — 400, нічого не створено", async () => {
    const res = await post({ units: [{ name: "X", avatar: "data:image/png;base64,AAA" }] });

    expect(res.status).toBe(400);
    expect(db.unit.createMany).not.toHaveBeenCalled();
  });
});
