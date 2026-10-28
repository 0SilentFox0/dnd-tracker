import { expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ prisma: {
  campaignMember: { findMany: async () => [{ role: "dm" }] },
  assistantIntent: { findFirst: async () => ({ id: "i", actionId: "show.command", status: "applied", summary: "Cleared", targets: [], expiresAt: new Date(), createdAt: new Date(), redactedAt: new Date(), preview: null, channel: "chat" }) },
  assistantReceipt: { findFirst: async () => ({ id: "r", intentId: "i", actionId: "show.command", status: "applied", result: { data: { seq: 2 }, affected: [], warnings: [] }, effectsStatus: "complete", payload: "SECRET" }) },
} }));
import { assistantStatusTool } from "../assistant-status";
import { type AiToolContext,runTool } from "../define";

const ctx: AiToolContext = { campaignId: "c", userId: "dm", threadId: null, scopes: ["show:read"], caller: { actor: { campaignId: "c", userId: "dm", isDM: true, via: "session", scopes: null }, channel: "chat", tokenId: null, threadId: null } };

it("status still returns an authorized durable receipt after preview redaction", async () => {
  const text = await runTool(assistantStatusTool, ctx, { intentId: "i" });

  expect(JSON.parse(text)).toMatchObject({ kind: "result", data: { intent: null, receipt: { id: "r", status: "applied", result: { data: { seq: 2 } } } } });
  expect(text).not.toContain("SECRET");
});
