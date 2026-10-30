import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

import { GET } from "@/app/api/campaigns/[id]/scenario/index/route";
import { loadScenarioIndex } from "@/lib/server/scenario/index-store";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/server/scenario/index-store", () => ({ loadScenarioIndex: vi.fn() }));

const params = { params: Promise.resolve({ id: "camp" }) };

const call = () => GET(new Request("http://x"), params);

describe("GET scenario index", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the requireDM response untouched for non-DMs", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "no" }, { status: 403 }));

    const res = await call();

    expect(res.status).toBe(403);
    expect(loadScenarioIndex).not.toHaveBeenCalled();
  });

  it("returns the index for the DM", async () => {
    const index = { scenes: [], entities: [], edges: [], counts: { scenes: 0, entities: 0, edges: 0, byType: {}, missing: 0 } };

    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "u", isDM: true } as never);
    vi.mocked(loadScenarioIndex).mockResolvedValue(index);

    const res = await call();

    expect(res.status).toBe(200);
    expect(await getResponseJson(res)).toEqual(index);
    expect(loadScenarioIndex).toHaveBeenCalledWith("camp");
  });

  it("maps loader failures through handleApiError", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "u", isDM: true } as never);
    vi.mocked(loadScenarioIndex).mockRejectedValue(new Error("boom"));

    expect((await call()).status).toBe(500);
  });
});
