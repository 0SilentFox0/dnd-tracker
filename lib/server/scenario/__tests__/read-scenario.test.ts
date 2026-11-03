import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getScenarioPageHandler, listScenarioHandler } from "../read-scenario";

const mocks = vi.hoisted(() => ({ access: vi.fn(), list: vi.fn(), load: vi.fn(), toPage: vi.fn() }));

vi.mock("@/lib/server/scenario/loaders", () => ({ loadOwnedPage: mocks.load }));
vi.mock("@/lib/server/scenario/page-store", () => ({
  InvalidScenarioContentError: class InvalidScenarioContentError extends Error {},
  listPages: mocks.list,
  OWNED_WITH_CONTENT_SELECT: {},
  toPage: mocks.toPage,
}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignDMOrDemoAccess: mocks.access }));

describe("scenario content read access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ userId: "u1", isDM: false, isDemo: true });
    mocks.list.mockResolvedValue([{ id: "demo-page" }]);
    mocks.load.mockResolvedValue({ id: "demo-page" });
    mocks.toPage.mockReturnValue({ id: "demo-page", title: "The Demo" });
  });

  it("lists and reads pages for Demo", async () => {
    const list = await listScenarioHandler("demo");

    const page = await getScenarioPageHandler("demo", "demo-page");

    expect(await list.json()).toEqual([{ id: "demo-page" }]);
    expect(await page.json()).toEqual({ id: "demo-page", title: "The Demo" });
    expect(mocks.access).toHaveBeenCalledTimes(2);
  });

  it("does not allow a normal player to read DM scenario pages", async () => {
    mocks.access.mockResolvedValue(NextResponse.json({ error: "forbidden" }, { status: 403 }));

    expect((await listScenarioHandler("campaign")).status).toBe(403);
    expect((await getScenarioPageHandler("campaign", "page")).status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
