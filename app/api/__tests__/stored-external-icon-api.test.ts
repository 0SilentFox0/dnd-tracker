import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupMock = vi.hoisted(() => vi.fn());

vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

vi.mock("@/lib/utils/api/api-auth", () => ({
  requireDM: vi.fn(async () => ({ userId: "u1" })),
  requireCampaignAccess: vi.fn(async () => ({ userId: "u1" })),
}));

vi.mock("@/lib/db", async () => {
  const { contentDatabaseDouble } = await import("@/lib/server/content/__tests__/database-double");

  return { prisma: contentDatabaseDouble({ artifact: { findFirst: vi.fn(), update: vi.fn() } }) };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      listBuckets: async () => ({ data: [{ name: "artifact-icons" }], error: null }),
      from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: "https://s/x" } }) }),
    },
  }),
}));

vi.mock("@/lib/server/artifacts/artifact-set-queries", () => ({
  findArtifactSetInCampaign: vi.fn(async () => ({ id: "s1", campaignId: "c1", icon: "https://game-icons.net/a.svg" })),
  buildArtifactSetPatchInput: vi.fn(() => ({})),
  updateArtifactSetRow: vi.fn(),
  reloadArtifactSetDetail: vi.fn(async () => ({ id: "s1" })),
  deleteArtifactSetAndClearArtifacts: vi.fn(),
}));

import { prisma } from "@/lib/db";

const SVG_URL = "https://game-icons.net/icons/a.svg";

const req = (body: unknown) => new Request("http://localhost/x", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

describe("PATCH with an already stored external icon", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.mocked(prisma.artifact.findFirst).mockResolvedValue({ id: "a1", campaignId: "c1", icon: SVG_URL } as never);
    vi.mocked(prisma.artifact.update).mockResolvedValue({ id: "a1" } as never);
  });

  it("artifact: same SVG icon -> 200, no fetch, icon kept", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/artifacts/[artifactId]/route");

    const res = await PATCH(req({ name: "N", icon: SVG_URL }), { params: Promise.resolve({ id: "c1", artifactId: "a1" }) });

    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.artifact.update).mock.calls[0][0].data).toMatchObject({ icon: SVG_URL });
  });

  it("artifact: a NEW SVG URL is rejected with the Ukrainian message", async () => {
    fetchMock.mockResolvedValue(new Response("<svg/>", { status: 200, headers: { "content-type": "image/svg+xml" } }));

    const { PATCH } = await import("@/app/api/campaigns/[id]/artifacts/[artifactId]/route");

    const res = await PATCH(req({ icon: "https://game-icons.net/icons/b.svg" }), { params: Promise.resolve({ id: "c1", artifactId: "a1" }) });

    expect(res.status).toBe(422);
    expect((await res.json()).errorKey).toBe("errors.imageFormats");
    expect(prisma.artifact.update).not.toHaveBeenCalled();
  });

  it("artifact set: same SVG icon -> 200, no fetch", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/artifact-sets/[setId]/route");

    const res = await PATCH(req({ icon: "https://game-icons.net/a.svg" }), { params: Promise.resolve({ id: "c1", setId: "s1" }) });

    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("artifact set: a NEW SVG URL is rejected", async () => {
    fetchMock.mockResolvedValue(new Response("<svg/>", { status: 200, headers: { "content-type": "image/svg+xml" } }));

    const { PATCH } = await import("@/app/api/campaigns/[id]/artifact-sets/[setId]/route");

    const res = await PATCH(req({ icon: "https://game-icons.net/new.svg" }), { params: Promise.resolve({ id: "c1", setId: "s1" }) });

    expect(res.status).toBe(422);
    expect((await res.json()).errorKey).toBe("errors.imageFormats");
  });
});
