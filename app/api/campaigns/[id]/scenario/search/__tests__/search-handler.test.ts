import { beforeEach, describe, expect, it, vi } from "vitest";

import { searchScenarioHandler } from "../search-handler";

const mocks = vi.hoisted(() => ({ access: vi.fn(), search: vi.fn() }));

vi.mock("@/lib/server/scenario/search", () => ({ searchScenarioPages: mocks.search }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignDMOrDemoAccess: mocks.access }));

describe("scenario search read access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ userId: "u1", isDM: false, isDemo: true });
    mocks.search.mockResolvedValue([{ pageId: "demo-page" }]);
  });

  it("searches read-only Demo scenario pages", async () => {
    const response = await searchScenarioHandler(new Request("http://localhost?q=bell"), "demo");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ pageId: "demo-page" }]);
    expect(mocks.search).toHaveBeenCalledWith("demo", "bell");
  });
});
