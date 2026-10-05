import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { buildTreeJson } from "@/lib/utils/skills/progression";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    skillTree: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    mainSkill: { findMany: vi.fn() },
    skill: { findMany: vi.fn() },
  },
}));

const RAW = buildTreeJson({ race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", outer: ["o1"] }] });

const patch = async (treeId: string, skills: unknown) => {
  const { PATCH } = await import("@/app/api/campaigns/[id]/skill-trees/[treeId]/route");

  return PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ race: "Ельф", skills }) }), { params: Promise.resolve({ id: "camp", treeId }) });
};

describe("PATCH skill tree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm" } as never);
    vi.mocked(prisma.mainSkill.findMany).mockResolvedValue([{ id: "attack" }] as never);
    vi.mocked(prisma.skill.findMany).mockResolvedValue([{ id: "o1" }] as never);
    vi.mocked(prisma.skillTree.create).mockImplementation((async ({ data }: { data: object }) => ({ id: "generated", ...data })) as never);
    vi.mocked(prisma.skillTree.update).mockImplementation((async ({ where, data }: { where: { id: string }; data: object }) => ({ id: where.id, race: "Ельф", ...data })) as never);
  });

  it("новий: створює з власним id, skills.id = id рядка", async () => {
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(null);

    const body = await getResponseJson<{ id: string; skills: { id: string } }>(await patch("mock-Ельф-camp", RAW) as never);

    const data = vi.mocked(prisma.skillTree.create).mock.calls[0][0].data as Record<string, unknown>;

    expect(data.id).toBeUndefined();
    expect(vi.mocked(prisma.skillTree.update).mock.calls[0][0]).toMatchObject({ where: { id: "generated" }, data: { skills: { id: "generated" } } });
    expect(body.id).toBe("generated");
  });

  it("існуючий у кампанії за id — оновлює, skills.id = id рядка", async () => {
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValueOnce({ id: "row", campaignId: "camp", race: "Ельф" } as never);

    await patch("row", RAW);

    expect(vi.mocked(prisma.skillTree.update).mock.calls[0][0]).toMatchObject({ where: { id: "row" }, data: { skills: { id: "row" } } });
  });

  it("дубль скіла → 400 з помилками", async () => {
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(null);

    const raw = buildTreeJson({ race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", levels: { basic: "o1" }, outer: ["o1"] }] });

    const res = await patch("new", raw);

    expect(res.status).toBe(400);
    expect(await getResponseJson(res as never)).toEqual({ errors: [{ code: "duplicateSkill", ref: "o1" }] });
  });
});
