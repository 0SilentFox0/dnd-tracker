import { beforeEach, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ member: true, revoked: false, grants: ["ai"], reads: 0 }));

vi.mock("@/lib/db", () => ({ prisma: {
  campaignMember: { findMany: async () => f.member ? [{ role: "dm" }] : [] },
  apiToken: { findUnique: async () => ({ id: "token", campaignId: "c", userId: "dm", revokedAt: f.revoked ? new Date() : null, scopes: f.grants }) },
  campaign: { findUnique: async () => { f.reads++;

 return { name: "Private campaign" }; } },
} }));
import { getCampaignBriefTool } from "../campaign";
import { type AiToolContext, runTool } from "../define";

const ctx: AiToolContext = { campaignId: "c", userId: "dm", threadId: null, scopes: ["ai"], caller: { actor: { campaignId: "c", userId: "dm", via: "token", isDM: true, scopes: ["ai"] }, tokenId: "token", channel: "mcp", threadId: null } };

beforeEach(() => { f.member = true; f.revoked = false; f.grants = ["ai"]; f.reads = 0; });
it.each(["revoked", "membership", "scopes"])("legacy ai read repeats live authorization: %s", async kind => {
  if (kind === "revoked") f.revoked = true;

  if (kind === "membership") f.member = false;

  if (kind === "scopes") f.grants = ["show:read"];

  const out = JSON.parse(await runTool(getCampaignBriefTool, ctx, {}));

  expect(out).toMatchObject({ kind: "error", error: { status: 403 } });
  expect(f.reads).toBe(0);
});
