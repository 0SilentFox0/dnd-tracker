import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn(), update: vi.fn() } } }));

const access = (userId: string, role: "dm" | "player") => ({ userId, campaign: { id: "camp", members: [{ userId, role }] } }) as never;

const DM_GOAL = { id: "d1", text: "Знайти брата", status: "active", author: "dm" };

const put = async (goals: unknown, seen?: string[]) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/goals/route");

  return mod.PUT(new Request("http://x", { method: "PUT", body: JSON.stringify({ goals, seen }) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("PUT goals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp", controlledBy: "owner", goals: [DM_GOAL] } as never);
    vi.mocked(prisma.character.update).mockImplementation(((args: { data: { goals: unknown } }) => Promise.resolve({ goals: args.data.goals })) as never);
  });

  it("гравець: ціль ДМа незмінна, author ставить сервер", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const res = await put([{ ...DM_GOAL, text: "Зламано", author: "player" }, { id: "p1", text: "Моя", status: "active", author: "dm" }]);

    expect(res.status).toBe(200);
    expect(await getResponseJson(res)).toEqual({ goals: [DM_GOAL, { id: "p1", text: "Моя", status: "active", author: "player" }] });
  });

  it("чужий гравець — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("other", "player"));
    expect((await put([])).status).toBe(403);
  });

  it("ДМ пише все; без author — dm", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));

    const res = await put([{ id: "n", text: "Нова", status: "done" }]);

    expect(await getResponseJson(res)).toEqual({ goals: [{ id: "n", text: "Нова", status: "done", author: "dm" }] });
  });

  it("текст понад 300 символів — 400", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    expect((await put([{ id: "x", text: "a".repeat(301), status: "active" }])).status).toBe(400);
  });

  it("ДМ зі старим кешем не стирає ціль гравця, якої ще не бачив", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));

    const fresh = { id: "p9", text: "Щойно додана", status: "active", author: "player" };

    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp", controlledBy: "owner", goals: [DM_GOAL, fresh] } as never);

    const res = await put([{ ...DM_GOAL, status: "done" }], ["d1"]);

    expect(await getResponseJson(res)).toEqual({ goals: [{ ...DM_GOAL, status: "done" }, fresh] });
  });

  it("ДМ видаляє ціль гравця, яку бачив", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp", controlledBy: "owner", goals: [DM_GOAL, { id: "p1", text: "x", status: "active", author: "player" }] } as never);

    expect(await getResponseJson(await put([DM_GOAL], ["d1", "p1"]))).toEqual({ goals: [DM_GOAL] });
  });

  it("не-JSON тіло — 400", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/goals/route");

    const res = (await mod.PUT(new Request("http://x", { method: "PUT", body: "{oops" }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) })) as NextResponse;

    expect(res.status).toBe(400);
  });
});
