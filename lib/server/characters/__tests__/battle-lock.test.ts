import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { battleParticipant: { findFirst: vi.fn() } } }));

describe("rejectIfInActiveBattle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries character participants (incl. reserve) of active battles in the campaign", async () => {
    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValue(null);

    expect(await rejectIfInActiveBattle("camp", ["a", "b"])).toBeNull();
    expect(prisma.battleParticipant.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { sourceType: "character", sourceId: { in: ["a", "b"] }, battle: { campaignId: "camp", status: "active" } } }));
  });

  it("409 with the in-battle text when found", async () => {
    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValue({ id: "bp" } as never);

    const res = await rejectIfInActiveBattle("camp", ["a"]);

    expect(res?.status).toBe(409);
    expect((await res?.json()).error).toBe(API_ERRORS.CHARACTER_IN_BATTLE);
  });
});
