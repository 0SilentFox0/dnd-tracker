import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireCampaignDM: vi.fn() }));

vi.mock("@/lib/server/campaigns/access", () => ({ requireCampaignDM: mocks.requireCampaignDM }));
vi.mock("../page-client", () => ({ GraphPageClient: () => null }));

import DMGraphPage from "../page";

beforeEach(() => vi.clearAllMocks());

describe("DM graph page (server)", () => {
  it("перевіряє DM-доступ і віддає клієнту id та назву кампанії", async () => {
    mocks.requireCampaignDM.mockResolvedValue({ campaign: { name: "Кампанія" } });

    const el = (await DMGraphPage({ params: Promise.resolve({ id: "c1" }) })) as ReactElement<Record<string, unknown>>;

    expect(mocks.requireCampaignDM).toHaveBeenCalledWith("c1");
    expect(el.props).toMatchObject({ campaignId: "c1", campaignName: "Кампанія" });
  });

  it("не-DM: помилка гарда прокидається", async () => {
    mocks.requireCampaignDM.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(DMGraphPage({ params: Promise.resolve({ id: "c1" }) })).rejects.toThrow("NEXT_REDIRECT");
  });
});
