import { beforeEach, describe, expect, it, vi } from "vitest";

import DMWorldPage from "../page";

import { prisma } from "@/lib/db";

const client = vi.fn((_: unknown) => null);

vi.mock("../page-client", () => ({ WorldEditorPageClient: (props: unknown) => client(props) }));
vi.mock("@/lib/db", () => ({ prisma: { worldMarker: { findFirst: vi.fn() } } }));
vi.mock("@/lib/providers/prefetched-query", () => ({ PrefetchedQuery: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/server/campaigns/access", () => ({ requireCampaignDM: vi.fn(async () => ({ campaign: { name: "K" } })) }));
vi.mock("@/lib/server/world/map-handlers", () => ({
  listWorldMapsHandler: vi.fn(async () => Response.json([{ id: "root", parentMarkerId: null }, { id: "cave", parentMarkerId: "k0" }])),
  getWorldMapHandler: vi.fn(async () => Response.json({ map: {}, markers: [] })),
}));

const render = async (search: { map?: string; marker?: string }) => {
  const el = (await DMWorldPage({ params: Promise.resolve({ id: "c1" }), searchParams: Promise.resolve(search) })) as { props: Record<string, unknown> };

  const node = (function find(n: { props: Record<string, unknown> }): { props: Record<string, unknown> } {
    return n.props.campaignId ? n : find(n.props.children as { props: Record<string, unknown> });
  })(el);

  return node.props;
};

describe("DM world page", () => {
  beforeEach(() => vi.mocked(prisma.worldMarker.findFirst).mockReset());

  it("?marker= відкриває карту маркера й вибирає його", async () => {
    vi.mocked(prisma.worldMarker.findFirst).mockResolvedValue({ mapId: "cave" } as never);

    expect(await render({ marker: "k1" })).toMatchObject({ mapId: "cave", initialSelectedId: "k1" });
    expect(prisma.worldMarker.findFirst).toHaveBeenCalledWith({ where: { id: "k1", map: { campaignId: "c1" } }, select: { mapId: true } });
  });

  it("маркер чужої кампанії чи неіснуючий — корінь без вибору", async () => {
    vi.mocked(prisma.worldMarker.findFirst).mockResolvedValue(null);

    expect(await render({ marker: "alien" })).toMatchObject({ mapId: "root", initialSelectedId: undefined });
  });
});
