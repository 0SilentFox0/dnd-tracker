import { beforeEach, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/server/assistant/execute", () => ({ dispatchAction: f.dispatch, rejectIntent: vi.fn() }));
import { CONTENT_TOOLS } from "../content";
import { type AiToolContext,runTool } from "../define";
import { toolsFor } from "../index";

const ctx: AiToolContext = { campaignId: "c", userId: "dm", scopes: ["content:write"], threadId: null, caller: { actor: { campaignId: "c", userId: "dm", isDM: true, via: "token", scopes: ["content:write"] }, tokenId: "verified", channel: "mcp", threadId: null } };

function toolOf(name: string) {
  const found = CONTENT_TOOLS.find(t => t.name === name);

  if (!found) throw new Error(name);

  return found;
}

beforeEach(() => { f.dispatch.mockReset(); f.dispatch.mockResolvedValue({ kind: "pending", intent: { id: "i", status: "pending" }, reviewUrl: "/review" }); });
it.each([
  ["content_kinds", {}, "content.kinds"], ["content_schema", { kind: "units" }, "content.schema"],
  ["content_list", { kind: "units", offset: 50 }, "content.units.list"], ["content_get", { kind: "units", id: "u" }, "content.units.get"],
  ["content_create", { kind: "units", data: { name: "Goblin" } }, "content.units.create"],
  ["content_update", { kind: "units", id: "u", patch: { name: "Orc" } }, "content.units.update"],
  ["content_delete", { kind: "units", id: "u" }, "content.units.delete"],
  ["get_rules", {}, "rules.get"], ["update_rules", { patch: {} }, "rules.update"],
  ["get_skill_tree", { race: "Human" }, "skill-trees.get"],
  ["save_skill_tree", { race: "Human", skills: { mainSkills: [{ id: "m", name: "M", color: "red" }] } }, "skill-trees.save"],
  ["source_diff", { scope: "units", offset: 2, limit: 1 }, "source.diff"],
  ["source_apply", { apply: [{ scope: "units", key: "u", sourceHash: "h", status: "new" }] }, "source.apply"],
] as const)("%s uses the canonical dispatcher and returns pending metadata", async (name, input, actionId) => {
  const output = JSON.parse(await runTool(toolOf(name), ctx, input));

  expect(output).toMatchObject({ version: 2, kind: "result", data: { kind: "pending", intent: { status: "pending" } } });
  expect(f.dispatch).toHaveBeenCalledWith(ctx.caller, expect.objectContaining({ actionId }), undefined);
  expect(JSON.stringify(output)).not.toContain("verified");
});
it("missing caller cannot become a token actor", async () => {
  const out = JSON.parse(await runTool(toolOf("content_get"), { ...ctx, caller: undefined }, { kind: "units", id: "u" }));

  expect(out).toMatchObject({ kind: "error", error: { status: 403 } });
  expect(f.dispatch).not.toHaveBeenCalled();
});
it("filters content writes while keeping read and generic discovery", () => {
  const names = toolsFor(["content:read"]).map(t => t.name);

  expect(names).toContain("content_list"); expect(names).toContain("assistant_capabilities");
  expect(names).not.toContain("content_create"); expect(names).not.toContain("source_apply");
});
it.each([{ race: "Human", skills: {} }, { race: "Human", skills: { mainSkills: [] } }, { race: "Human", tree: {} }])("rejects invalid tree shape before dispatch", async input => {
  const out = JSON.parse(await runTool(toolOf("save_skill_tree"), ctx, input));

  expect(out).toMatchObject({ kind: "error", error: { status: 400 } }); expect(f.dispatch).not.toHaveBeenCalled();
});
