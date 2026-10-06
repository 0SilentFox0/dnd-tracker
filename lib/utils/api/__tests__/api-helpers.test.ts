import { describe, expect, it } from "vitest";

import { getCampaignApiUrl, getCampaignId } from "../api-helpers";

describe("api-helpers", () => {
  describe("getCampaignId", () => {
    it("повертає paramsId якщо передано", () => {
      expect(getCampaignId("camp-123")).toBe("camp-123");
    });

    it.each([undefined, null, ""])("без campaignId (%s) кидає помилку замість фолбеку", (id) => {
      expect(() => getCampaignId(id)).toThrow("Campaign ID is required");
    });
  });

  describe("getCampaignApiUrl", () => {
    it("повертає URL з campaignId та endpoint", () => {
      expect(getCampaignApiUrl("/skills", "c1")).toBe("/api/campaigns/c1/skills");
    });

    it("без campaignId кидає помилку", () => {
      expect(() => getCampaignApiUrl("/battles")).toThrow("Campaign ID is required");
    });
  });
});
