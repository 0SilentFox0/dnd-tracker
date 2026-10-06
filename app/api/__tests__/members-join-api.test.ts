import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CampaignRole } from "@/lib/constants/campaigns";

const db = vi.hoisted(() => ({
  campaign: { findUnique: vi.fn() },
  campaignMember: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  user: { findUnique: vi.fn(), create: vi.fn() },
}));

const auth = vi.hoisted(() => ({ requireAuthUser: vi.fn(), requireDM: vi.fn() }));

const kvDel = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/kv", () => ({ kvDel }));
vi.mock("@/lib/utils/api/api-auth", async (orig) => ({
  ...(await orig<object>()),
  requireAuthUser: auth.requireAuthUser,
  requireDM: auth.requireDM,
}));

import * as member from "@/app/api/campaigns/[id]/members/[memberId]/route";
import * as join from "@/app/api/campaigns/join/route";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

const ctxMember = { params: Promise.resolve({ id: "c1", memberId: "m1" }) };

const removeMember = () => member.DELETE(new Request("http://x", { method: "DELETE" }), ctxMember);

const joinWith = (inviteCode: string) =>
  join.POST(new Request("http://x", { method: "POST", body: JSON.stringify({ inviteCode }) }));

describe("DELETE /campaigns/:id/members/:memberId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.requireDM.mockResolvedValue({ userId: "dm" });
    db.campaignMember.findUnique.mockResolvedValue({ id: "m1", campaignId: "c1", role: CampaignRole.PLAYER });
  });

  it("гравцю — 403 без видалення", async () => {
    auth.requireDM.mockResolvedValue(forbidden());

    expect((await removeMember()).status).toBe(403);
    expect(db.campaignMember.deleteMany).not.toHaveBeenCalled();
  });

  it("учасник іншої кампанії — 403", async () => {
    db.campaignMember.findUnique.mockResolvedValue({ id: "m1", campaignId: "c2", role: CampaignRole.PLAYER });

    expect((await removeMember()).status).toBe(403);
    expect(db.campaignMember.deleteMany).not.toHaveBeenCalled();
  });

  it("DM не можна видалити — 400", async () => {
    db.campaignMember.findUnique.mockResolvedValue({ id: "m1", campaignId: "c1", role: CampaignRole.DM });

    expect((await removeMember()).status).toBe(400);
    expect(db.campaignMember.deleteMany).not.toHaveBeenCalled();
  });

  it("DM видаляє гравця", async () => {
    expect((await removeMember()).status).toBe(200);
    expect(db.campaignMember.deleteMany).toHaveBeenCalledWith({ where: { id: "m1" } });
  });
});

describe("POST /campaigns/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.requireAuthUser.mockResolvedValue({ userId: "u1", authUser: { id: "u1", email: "u1@x.y" } });
    db.campaign.findUnique.mockResolvedValue({ id: "c1", status: "active", members: [{ userId: "dm" }] });
    db.user.findUnique.mockResolvedValue({ id: "u1" });
    db.campaignMember.create.mockResolvedValue({ id: "m9" });
  });

  it("без сесії — 401", async () => {
    auth.requireAuthUser.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    expect((await joinWith("code")).status).toBe(401);
    expect(db.campaignMember.create).not.toHaveBeenCalled();
  });

  it("невідомий код — 404", async () => {
    db.campaign.findUnique.mockResolvedValue(null);

    expect((await joinWith("nope")).status).toBe(404);
  });

  it("вже учасник — 400 без дубля", async () => {
    db.campaign.findUnique.mockResolvedValue({ id: "c1", status: "active", members: [{ userId: "u1" }] });

    expect((await joinWith("code")).status).toBe(400);
    expect(db.campaignMember.create).not.toHaveBeenCalled();
  });

  it("приєднує лише як гравця і скидає кеш списку кампаній", async () => {
    expect((await joinWith("code")).status).toBe(200);
    expect(db.campaignMember.create.mock.calls[0][0].data).toEqual({ campaignId: "c1", userId: "u1", role: CampaignRole.PLAYER });
    expect(kvDel).toHaveBeenCalledWith("campaigns:u1");
  });
});
