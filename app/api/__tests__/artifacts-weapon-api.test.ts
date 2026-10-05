import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils/api/api-auth", () => ({
  requireDM: vi.fn(async () => ({ userId: "u1" })),
  requireCampaignAccess: vi.fn(async () => ({ userId: "u1" })),
  validateCampaignOwnership: vi.fn(() => null),
}));

vi.mock("@/lib/db", () => ({
  prisma: { artifact: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() } },
}));

import { prisma } from "@/lib/db";

const ctx = { params: Promise.resolve({ id: "c1", artifactId: "a1" }) };

const patch = (body: unknown) => new Request("http://localhost/api/campaigns/c1/artifacts/a1", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

describe("artifact weapon stats API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.artifact.findUnique).mockResolvedValue({ id: "a1", campaignId: "c1", slot: "weapon" } as never);
    vi.mocked(prisma.artifact.update).mockResolvedValue({ id: "a1", campaignId: "c1" } as never);
  });

  it("PATCH weapon пише bonuses/modifiers, які читає бій", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/artifacts/[artifactId]/route");

    const res = await PATCH(patch({ weapon: { damageDice: "2d8", damageType: "fire", attackBonus: 1 } }), ctx);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.artifact.update).mock.calls[0][0].data).toMatchObject({
      bonuses: { attackBonus: 1 },
      modifiers: [
        { type: "damageDice", value: "2d8" },
        { type: "damageType", value: "fire" },
      ],
    });
  });

  it("PATCH без weapon не чіпає колонки зброї", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/artifacts/[artifactId]/route");

    await PATCH(patch({ name: "Новий" }), ctx);

    const data = vi.mocked(prisma.artifact.update).mock.calls[0][0].data as Record<string, unknown>;

    expect(data).not.toHaveProperty("bonuses");
    expect(data).not.toHaveProperty("modifiers");
  });
});
