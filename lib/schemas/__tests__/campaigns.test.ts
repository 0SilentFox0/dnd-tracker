import { describe, expect, it } from "vitest";

import { createCampaignSchema, updateCampaignSchema } from "@/lib/schemas/campaigns";

describe("critChoiceByDm", () => {
  it("update-схема приймає boolean і відкидає інше", () => {
    expect(updateCampaignSchema.parse({ critChoiceByDm: true }).critChoiceByDm).toBe(true);
    expect(updateCampaignSchema.safeParse({ critChoiceByDm: "yes" }).success).toBe(false);
    expect(updateCampaignSchema.parse({}).critChoiceByDm).toBeUndefined();
  });

  it("create-схема за замовчуванням false", () => {
    expect(createCampaignSchema.parse({ name: "Зоря" }).critChoiceByDm).toBe(false);
  });
});
