import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn().mockResolvedValue({ userId: "u1", campaign: { rules: WFRP_RULES, members: [] } }) }));

import { createDraft } from "../create-draft";

describe("createDraft system gate", () => {
  it("rejects drafts in a wfrp campaign with 409", async () => {
    const res = await createDraft(new Request("http://x", { method: "POST", body: "{}" }), "c1");

    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(409);
  });
});
