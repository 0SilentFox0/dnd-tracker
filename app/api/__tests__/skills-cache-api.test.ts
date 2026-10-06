import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  skill: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
}));

const revalidateTag = vi.hoisted(() => vi.fn());

const requireDM = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/lib/utils/api/api-auth", async (orig) => ({ ...(await orig<object>()), requireDM }));

import * as duplicate from "@/app/api/campaigns/[id]/skills/[skillId]/duplicate/route";
import * as one from "@/app/api/campaigns/[id]/skills/[skillId]/route";
import * as list from "@/app/api/campaigns/[id]/skills/route";

const ctx = { params: Promise.resolve({ id: "c1" }) };

const ctxOne = { params: Promise.resolve({ id: "c1", skillId: "s1" }) };

const req = (method: string, body?: unknown) =>
  new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const row = {
  id: "s1",
  campaignId: "c1",
  name: "Удар",
  description: null,
  icon: null,
  image: null,
  spellId: null,
  spellGroupId: null,
  grantedSpellId: null,
  mainSkillId: null,
  spellEnhancementData: {},
  spellEnhancementTypes: [],
  spellEffectIncrease: null,
  spellTargetChange: null,
  spellAdditionalModifier: null,
  spellNewSpellId: null,
  abilities: [],
  spell: null,
  spellGroup: null,
  grantedSpell: null,
  mainSkill: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const writes: Array<[string, () => Promise<Response>]> = [
  ["POST /skills", () => list.POST(req("POST", { basicInfo: { name: "Удар" }, spellData: {}, spellEnhancementData: {}, mainSkillData: {} }), ctx)],
  ["DELETE /skills", () => list.DELETE(req("DELETE"), ctx)],
  ["PATCH /skills/:id", () => one.PATCH(req("PATCH", { basicInfo: { name: "Новий" } }), ctxOne)],
  ["DELETE /skills/:id", () => one.DELETE(req("DELETE"), ctxOne)],
  ["POST /skills/:id/duplicate", () => duplicate.POST(req("POST"), ctxOne)],
];

describe("skills API — кеш", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireDM.mockResolvedValue({ userId: "dm" });
    db.skill.create.mockResolvedValue(row);
    db.skill.findUnique.mockResolvedValue(row);
    db.skill.update.mockResolvedValue(row);
    db.skill.deleteMany.mockResolvedValue({ count: 1 });
  });

  it.each(writes)("%s скидає кеш скілів одразу", async (_name, call) => {
    const res = await call();

    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("skills-c1", { expire: 0 });
  });

  it.each(writes)("%s гравцю — 403 без інвалідації", async (_name, call) => {
    requireDM.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    expect((await call()).status).toBe(403);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
