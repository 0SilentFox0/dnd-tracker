import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ user: { upsert: vi.fn() }, campaign: { create: vi.fn() } }));

const kvDel = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/kv", () => ({ kvDel, kvGet: vi.fn(), kvSet: vi.fn() }));
vi.mock("@/lib/utils/api/api-auth", () => ({
  requireAuth: vi.fn(),
  requireAuthUser: vi.fn(async () => ({ userId: "u1", authUser: { id: "u1", email: "u1@x.y" } })),
}));

import { POST } from "@/app/api/campaigns/route";

const clash = (target: string) =>
  new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6", meta: { target: [target] } });

const create = () => POST(new Request("http://x", { method: "POST", body: JSON.stringify({ name: "Кампанія" }) }));

describe("POST /campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("створює користувача через upsert, код — 6 символів, скидає кеш списку", async () => {
    db.campaign.create.mockResolvedValue({ id: "c1" });

    expect((await create()).status).toBe(200);
    expect(db.user.upsert).toHaveBeenCalledTimes(1);
    expect(db.campaign.create.mock.calls[0][0].data.inviteCode).toMatch(/^[0-9A-Z]{6}$/);
    expect(kvDel).toHaveBeenCalledWith("campaigns:u1");
  });

  it("колізія коду запрошення — повтор з новим кодом", async () => {
    db.campaign.create.mockRejectedValueOnce(clash("inviteCode")).mockResolvedValue({ id: "c1" });

    expect((await create()).status).toBe(200);
    expect(db.campaign.create).toHaveBeenCalledTimes(2);
  });

  it("інша унікальна колізія не повторюється", async () => {
    db.campaign.create.mockRejectedValue(clash("name"));

    expect((await create()).status).not.toBe(200);
    expect(db.campaign.create).toHaveBeenCalledTimes(1);
  });
});
