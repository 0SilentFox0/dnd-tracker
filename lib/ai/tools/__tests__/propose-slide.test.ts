import { expect, it, vi } from "vitest";

const provider = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/ai/images", () => ({ generateSlideImage: provider }));
import { type AiToolContext,runTool } from "../define";
import { proposeSceneSlideTool } from "../propose-slide";

const ctx: AiToolContext = { campaignId: "c", userId: "dm", scopes: ["show:write"], threadId: null, caller: { actor: { campaignId: "c", userId: "dm", isDM: true, via: "session", scopes: null }, tokenId: null, channel: "chat", threadId: null } };

it("legacy paid alias fails closed before provider, regardless of model runId", async () => {
  for (const input of [{ pageId: "p", prompt: "Forest" }, { pageId: "p", prompt: "Forest", runId: "model", explicitRequest: true }]) {
    const out = JSON.parse(await runTool(proposeSceneSlideTool, ctx, input));

    expect(out).toMatchObject({ kind: "error", error: { status: 409 } });
  }
  expect(provider).not.toHaveBeenCalled();
});
it("parallel legacy paid aliases cannot charge", async () => {
  const outputs = await Promise.all([1, 2].map(() => runTool(proposeSceneSlideTool, ctx, { pageId: "p", prompt: "Forest" })));

  expect(outputs.every(out => JSON.parse(out).kind === "error")).toBe(true);
  expect(provider).not.toHaveBeenCalled();
});
