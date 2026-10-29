import { beforeEach, expect, it, vi } from "vitest";

const dispatch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/server/assistant/execute", () => ({ dispatchAction: dispatch, rejectIntent: vi.fn() }));
import { contentImportTool } from "../content";
import { type AiToolContext,runTool } from "../define";

const ctx: AiToolContext = { campaignId: "c", userId: "dm", scopes: ["content:write"], threadId: null, caller: { actor: { campaignId: "c", userId: "dm", isDM: true, via: "session", scopes: null }, tokenId: null, channel: "chat", threadId: null, locale: "uk" as const }, locale: "uk" as const };

beforeEach(() => dispatch.mockReset());
it.each([[true, "content.import-preview"], [false, "content.import"]] as const)("dryRun %s selects the canonical guarded operation", async (dryRun, actionId) => {
  dispatch.mockResolvedValue({ kind: dryRun ? "result" : "pending" });

  const out = JSON.parse(await runTool(contentImportTool, ctx, { kind: "units", rows: [{ name: "A" }], dryRun }));

  expect(out).toMatchObject({ version: 2, kind: "result", data: { kind: dryRun ? "result" : "pending" } });
  expect(dispatch).toHaveBeenCalledWith(ctx.caller, expect.objectContaining({ actionId, input: { kind: "units", body: { rows: [{ name: "A" }], mode: "create", dryRun } } }), undefined);
});
it.each([{ kind: "tracks", rows: [{}] }, { kind: "units", rows: Array.from({ length: 501 }, () => ({})) }])("rejects invalid imports before dispatcher", async input => {
  expect(JSON.parse(await runTool(contentImportTool, ctx, input))).toMatchObject({ kind: "error", error: { status: 400 } });
  expect(dispatch).not.toHaveBeenCalled();
});
