import { beforeEach, describe, expect, it, vi } from "vitest";

import { CampaignStatus } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";

vi.mock("@/lib/cache/kv", () => ({ kvGet: vi.fn(async () => null), kvSet: vi.fn(), kvDel: vi.fn() }));
vi.mock("@/lib/utils/api/api-auth", async (orig) => ({
  ...(await orig<object>()),
  requireAuth: vi.fn(async () => ({ userId: "player", authUser: {} })),
  requireAuthUser: vi.fn(async () => ({ userId: "player", authUser: {} })),
}));
vi.mock("@/lib/server/users/db-user", async (orig) => ({ ...(await orig<object>()), ensureDbUser: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findUnique: vi.fn(), findMany: vi.fn() },
    campaignMember: { create: vi.fn() },
    character: { findUnique: vi.fn() },
  },
}));

const SECRET = "лиходій — абат";

type Args = { omit?: { aiInstructions?: boolean } };

// mimics Prisma: a column in `omit` is not returned
const honoringOmit = <T extends Record<string, unknown>>(row: T) => async (args: Args) => {
  const copy: Record<string, unknown> = { ...row };

  if (args?.omit?.aiInstructions) delete copy.aiInstructions;

  return copy;
};

const campaignRow = { id: "c1", name: "C", aiInstructions: SECRET, status: CampaignStatus.ACTIVE, inviteCode: "ABC", members: [{ userId: "player", role: "PLAYER" }], dm: { id: "dm" } };

describe("aiInstructions never reaches members", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/campaigns/[id]", async () => {
    vi.mocked(prisma.campaign.findUnique).mockImplementation(honoringOmit(campaignRow) as never);

    const { GET } = await import("@/app/api/campaigns/[id]/route");

    const res = await GET(new Request("http://x"), { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toContain(SECRET);
  });

  it("GET /api/campaigns (list)", async () => {
    vi.mocked(prisma.campaign.findMany).mockImplementation((async (args: Args) => [await honoringOmit(campaignRow)(args)]) as never);

    const { GET } = await import("@/app/api/campaigns/route");

    const res = await GET();

    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toContain(SECRET);
  });

  it("POST /api/campaigns/join", async () => {
    vi.mocked(prisma.campaign.findUnique).mockImplementation(honoringOmit({ ...campaignRow, members: [] }) as never);
    vi.mocked(prisma.campaignMember.create).mockImplementation((async (args: { include: { campaign: Args } }) => ({
      id: "m1",
      campaign: await honoringOmit(campaignRow)(args.include.campaign),
    })) as never);

    const { POST } = await import("@/app/api/campaigns/join/route");

    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ inviteCode: "ABC" }) }));

    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toContain(SECRET);
  });
});
