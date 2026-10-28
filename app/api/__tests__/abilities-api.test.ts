import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils/api/api-auth", () => ({
  requireDM: vi.fn(async () => ({ userId: "u1" })),
  requireCampaignAccess: vi.fn(async () => ({ userId: "u1" })),
}));

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: async (callback: (tx: object) => unknown) => callback({ $queryRaw: async () => [{ id: "c1" }] }),
    skill: { findFirst: vi.fn(), findMany: vi.fn(async () => [{ id: "s1", name: "Лють" }]), update: vi.fn(), create: vi.fn() },
    race: { findMany: vi.fn(async () => []), findFirst: vi.fn() },
    artifact: { findMany: vi.fn(async () => []), findFirst: vi.fn() },
    artifactSet: { findMany: vi.fn(async () => []), findFirst: vi.fn() },
    unit: { findMany: vi.fn(async () => [{ id: "u1", name: "Гоблін" }]), findFirst: vi.fn() },
    mainSkill: { count: vi.fn(async () => 1) },
  },
}));

import { prisma } from "@/lib/db";

const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve({ id: "c1", ...params }) as Promise<{ id: string } & T> });

const req = (url: string, init?: RequestInit) => new Request(`http://localhost${url}`, init);

describe("abilities API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sources — лише id і name", async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/abilities/sources/route");

    const res = await GET(req("/api/campaigns/c1/abilities/sources"), ctx({}));

    const body = await res.json();

    expect(body.sources).toEqual([
      { kind: "skill", id: "s1", name: "Лють" },
      { kind: "unit", id: "u1", name: "Гоблін" },
    ]);
    expect(vi.mocked(prisma.skill.findMany)).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true, name: true } }));
  });

  it("GET skill detail з NULL у колонці — порожні abilities без abilityIssues", async () => {
    vi.mocked(prisma.skill.findFirst).mockResolvedValue({ id: "s1", campaignId: "c1", name: "Лють", abilities: null } as never);

    const { GET } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const body = await (await GET(req("/api/campaigns/c1/skills/s1"), ctx({ skillId: "s1" }))).json();

    expect(body.abilities).toEqual([]);
    expect(body.abilityIssues).toEqual([]);
  });

  it("PATCH skill з abilities пише колонку; без abilities — не чіпає", async () => {
    vi.mocked(prisma.skill.findFirst).mockResolvedValue({ id: "s1", campaignId: "c1", name: "Лють" } as never);
    vi.mocked(prisma.skill.update).mockResolvedValue({ id: "s1", campaignId: "c1", name: "Лють", abilities: [] } as never);

    const { PATCH } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const abilities = [{ id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] }];

    expect((await PATCH(req("/api/campaigns/c1/skills/s1", { method: "PATCH", body: JSON.stringify({ abilities }) }), ctx({ skillId: "s1" }))).status).toBe(200);

    expect(vi.mocked(prisma.skill.update).mock.calls[0][0].data).toMatchObject({ abilities });

    vi.mocked(prisma.skill.update).mockClear();

    await PATCH(req("/api/campaigns/c1/skills/s1", { method: "PATCH", body: JSON.stringify({ mainSkillData: { mainSkillId: "m1" } }) }), ctx({ skillId: "s1" }));

    expect(vi.mocked(prisma.skill.update)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(prisma.skill.update).mock.calls[0][0].data).not.toHaveProperty("abilities");
  });

  it("PATCH з невалідними abilities → 400 з path", async () => {
    vi.mocked(prisma.skill.findFirst).mockResolvedValue({ id: "s1", campaignId: "c1", name: "Лють" } as never);

    const { PATCH } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const bad = [{ id: "a1", name: "Б", trigger: { event: "passive" }, effects: [{ kind: "heal", amount: 5 }] }];

    const res = await PATCH(req("/api/campaigns/c1/skills/s1", { method: "PATCH", body: JSON.stringify({ abilities: bad }) }), ctx({ skillId: "s1" }));

    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).toContain('"abilities"');
  });
});

it("unknown ability owner keeps the existing 400 error contract", async () => {
  const { API_ERRORS } = await import("@/lib/constants/api-errors");

  const { GET } = await import("@/app/api/campaigns/[id]/abilities/[kind]/[ownerId]/route");

  const response = await GET(req("/api/campaigns/c1/abilities/unknown/x"), ctx({ kind: "unknown", ownerId: "x" }));

  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: API_ERRORS.UNKNOWN_OWNER_KIND });
});
