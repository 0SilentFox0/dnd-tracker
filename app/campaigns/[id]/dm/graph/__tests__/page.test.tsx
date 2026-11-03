import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireCampaignDMOrDemo: vi.fn() }));

vi.mock("@/lib/server/campaigns/access", () => ({ requireCampaignDMOrDemo: mocks.requireCampaignDMOrDemo }));
vi.mock("../page-client", () => ({ GraphPageClient: () => null }));

import DMGraphPage from "../page";

beforeEach(() => vi.clearAllMocks());

describe("DM graph page (server)", () => {
  it("перевіряє DM-доступ і віддає клієнту id та назву кампанії", async () => {
    mocks.requireCampaignDMOrDemo.mockResolvedValue({ campaign: { name: "Кампанія" }, isDemo: true });

    const el = (await DMGraphPage({ params: Promise.resolve({ id: "c1" }) })) as ReactElement<Record<string, unknown>>;

    expect(mocks.requireCampaignDMOrDemo).toHaveBeenCalledWith("c1");
    expect(el.props).toMatchObject({ campaignId: "c1", campaignName: "Кампанія", canEdit: false });
  });

  it("не-DM: помилка гарда прокидається", async () => {
    mocks.requireCampaignDMOrDemo.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(DMGraphPage({ params: Promise.resolve({ id: "c1" }) })).rejects.toThrow("NEXT_REDIRECT");
  });
});
