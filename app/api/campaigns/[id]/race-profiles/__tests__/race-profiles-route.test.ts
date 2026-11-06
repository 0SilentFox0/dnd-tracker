import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listRaceProfiles } from "@/lib/server/races/race-profile";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/server/races/race-profile", () => ({ listRaceProfiles: vi.fn() }));

const get = async () => {
  const { GET } = await import("../route");

  return GET(new Request("http://x"), { params: Promise.resolve({ id: "camp" }) });
};

beforeEach(() => vi.clearAllMocks());

describe("GET /race-profiles", () => {
  it("returns the campaign's profiles to a member", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "p", isDM: false } as never);
    vi.mocked(listRaceProfiles).mockResolvedValue([{ raceId: "r1", profile: {} as never }]);

    expect(await (await get()).json()).toEqual({ profiles: [{ raceId: "r1", profile: {} }] });
    expect(listRaceProfiles).toHaveBeenCalledWith("camp");
  });

  it("passes an access rejection through", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await get()).status).toBe(403);
    expect(listRaceProfiles).not.toHaveBeenCalled();
  });
});
