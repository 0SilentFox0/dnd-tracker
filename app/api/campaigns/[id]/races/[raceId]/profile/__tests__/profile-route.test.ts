import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { saveRaceProfile } from "@/lib/server/races/race-profile";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/server/races/race-profile", () => ({ saveRaceProfile: vi.fn() }));

const valid = { move: 4, fate: 2, careerTable: [{ max: 100, careerId: "c1" }] };

const put = async (body: unknown) => {
  const { PUT } = await import("../route");

  return PUT(new Request("http://x", { method: "PUT", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", raceId: "r1" }) });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm" } as never);
});

describe("PUT /races/[raceId]/profile", () => {
  it("403 for a player", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 }));

    expect((await put(valid)).status).toBe(403);
    expect(saveRaceProfile).not.toHaveBeenCalled();
  });

  it("400 for an invalid profile", async () => {
    expect((await put({ ...valid, careerTable: [{ max: 50, careerId: "c1" }] })).status).toBe(400);
    expect(saveRaceProfile).not.toHaveBeenCalled();
  });

  it("saves the parsed profile with defaults and returns the item", async () => {
    vi.mocked(saveRaceProfile).mockImplementation(async (_c, raceId, profile) => ({ raceId, profile }));

    const res = await put(valid);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ raceId: "r1", profile: { move: 4, fate: 2, talents: [], extraWounds: 0 } });
    expect(saveRaceProfile).toHaveBeenCalledWith("camp", "r1", expect.objectContaining({ careerTable: valid.careerTable }));
  });
});
