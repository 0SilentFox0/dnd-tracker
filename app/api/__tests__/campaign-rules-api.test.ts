import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PATCH } from "@/app/api/campaigns/[id]/rules/route";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: async (callback: (tx: object) => unknown) => callback({ $queryRaw: async () => [{ id: "c1" }] }), campaign: { update: vi.fn(async () => ({})), findUnique: vi.fn() } } }));

const params = { params: Promise.resolve({ id: "c1" }) };

const access = (isDM: boolean, rules: unknown = {}) =>
  ({ userId: "u", isDM, campaign: { id: "c1", maxLevel: 20, members: [], rules: parseRules(rules) } }) as never;

const stored = (rules: unknown) => vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ rules } as never);

const patch = (body: unknown) => PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), params);

describe("campaign rules API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access(false));
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access(true));
    stored({});
  });

  it("GET від гравця: 200 і типові правила для {}", async () => {
    const res = await GET(new Request("http://x"), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(DEFAULT_RULES);
  });

  it("GET: кампанії немає — 404", async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

    expect((await GET(new Request("http://x"), params)).status).toBe(404);
  });

  it("PATCH від гравця: 403 без запису", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    expect((await patch({ morale: { enabled: false } })).status).toBe(403);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it("PATCH від ДМ зливає по секціях і зберігає злитий об'єкт", async () => {
    const res = await patch({ morale: { enabled: false } });

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.morale).toEqual({ enabled: false, cap: 3 });
    expect(body.criticals).toEqual(DEFAULT_RULES.criticals);
    expect(prisma.campaign.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { rules: body } });
  });

  it("PATCH {morale:{cap}} не вмикає вимкнену мораль", async () => {
    stored({ morale: { enabled: false, cap: 3 } });

    const res = await patch({ morale: { cap: 5 } });

    expect(res.status).toBe(200);
    expect((await res.json()).morale).toEqual({ enabled: false, cap: 5 });
  });

  it("PATCH з недопустимим значенням: 400 з issues", async () => {
    const res = await patch({ criticals: { critOn: 30 } });

    expect(res.status).toBe(400);
    expect(Array.isArray((await res.json()).issues)).toBe(true);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it("PATCH heroMin 20 при збереженому heroMax 16: 400 (refine на злитому значенні)", async () => {
    stored({ initiative: { heroMin: 10, heroMax: 16 } });

    const res = await patch({ initiative: { heroMin: 20 } });

    expect(res.status).toBe(400);
    expect((await res.json()).issues).toBeDefined();
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });
});
