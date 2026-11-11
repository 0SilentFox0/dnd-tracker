import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { invalidateCampaignRules } from "@/lib/hooks/campaigns/invalidate";
import { campaignKeys } from "@/lib/hooks/campaigns/keys";

describe("invalidateCampaignRules", () => {
  it("marks the rules query stale", async () => {
    const qc = new QueryClient();

    qc.setQueryData(campaignKeys.rules("c"), { systemLocked: false });

    await invalidateCampaignRules(qc, "c");

    expect(qc.getQueryState(campaignKeys.rules("c"))?.isInvalidated).toBe(true);
  });
});
