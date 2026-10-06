import { afterEach, describe, expect, it, vi } from "vitest";

import { campaignGet, campaignRequest } from "../client";

describe("campaignRequest", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("без campaignId кидає помилку й не робить запит", async () => {
    const fetch = vi.fn();

    vi.stubGlobal("fetch", fetch);

    await expect(campaignRequest("", "/spells")).rejects.toThrow("Campaign ID is required");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("будує URL кампанії", async () => {
    const fetch = vi.fn(async () => new Response("[]", { status: 200 }));

    vi.stubGlobal("fetch", fetch);

    await campaignGet("c1", "spells");

    expect(fetch).toHaveBeenCalledWith("/api/campaigns/c1/spells", expect.objectContaining({ method: "GET" }));
  });
});
