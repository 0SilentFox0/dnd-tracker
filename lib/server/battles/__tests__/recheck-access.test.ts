import { describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();

const findMany = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: { battleScene: { findFirst }, battleParticipant: { findMany } } }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: {} }));

const args = { battleId: "b1", campaignId: "c1", userId: "u1" };

describe("recheckAccess", () => {
  it("читає лише членство: без battleParticipant", async () => {
    findFirst.mockResolvedValueOnce({ version: 3, campaign: { members: [{ role: "dm" }] } });

    const { defaultPipelineDeps } = await import("@/lib/server/battles/pipeline-deps");

    await expect(defaultPipelineDeps.recheckAccess!(args)).resolves.toEqual({ isMember: true, isDM: true });
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("не-член і відсутній бій", async () => {
    const { defaultPipelineDeps } = await import("@/lib/server/battles/pipeline-deps");

    findFirst.mockResolvedValueOnce({ version: 3, campaign: { members: [] } });
    await expect(defaultPipelineDeps.recheckAccess!(args)).resolves.toEqual({ isMember: false, isDM: false });

    findFirst.mockResolvedValueOnce(null);
    await expect(defaultPipelineDeps.recheckAccess!(args)).resolves.toBeNull();
  });
});
