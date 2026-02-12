import { describe, expect, it, vi } from "vitest";

import { getCampaignApiUrl,getCampaignId } from "../api-helpers";

vi.mock("@/lib/constants/campaigns", () => ({
  DEFAULT_CAMPAIGN_ID: "default-campaign-id",
}));

describe("api-helpers", () => {
  describe("getCampaignId", () => {
    it("повертає paramsId якщо передано", () => {
      expect(getCampaignId("camp-123")).toBe("camp-123");
    });
    it("повертає дефолтний ID якщо paramsId порожній і useDefault true", () => {
      expect(getCampaignId(undefined, true)).toBe("default-campaign-id");
      expect(getCampaignId(null, true)).toBe("default-campaign-id");
    });
    it("кидає помилку якщо paramsId порожній і useDefault false", () => {
      expect(() => getCampaignId(undefined, false)).toThrow("Campaign ID is required");
    });
  });

  describe("getCampaignApiUrl", () => {
    it("повертає URL з campaignId та endpoint", () => {
      expect(getCampaignApiUrl("/skills", "c1")).toBe("/api/campaigns/c1/skills");
    });
    it("використовує дефолтний campaignId якщо не передано", () => {
      expect(getCampaignApiUrl("/battles")).toBe(
        "/api/campaigns/default-campaign-id/battles",
      );
    });
  });
});
