import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { assertNotInActiveBattle } from "@/lib/server/characters/battle-lock";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { battleParticipant: { findFirst: vi.fn() } } }));

describe("assertNotInActiveBattle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries character participants (incl. reserve) of active battles in the campaign", async () => {
    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValue(null);

    await expect(assertNotInActiveBattle("camp", ["a", "b"])).resolves.toBeUndefined();
    expect(prisma.battleParticipant.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { sourceType: "character", sourceId: { in: ["a", "b"] }, battle: { campaignId: "camp", status: "active" } } }));
  });

  it("throws 409 with the in-battle text when found", async () => {
    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValue({ id: "bp" } as never);

    await expect(assertNotInActiveBattle("camp", ["a"])).rejects.toMatchObject({ message: API_ERRORS.CHARACTER_IN_BATTLE, status: 409 });
  });
});
