import { beforeEach, expect, it, vi } from "vitest";

const dispatch = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => ({ kind: "result", result: { data: { name: "ok" }, affected: [], warnings: [] } })));

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/server/assistant/execute", () => ({ dispatchAction: dispatch, rejectIntent: vi.fn() }));
vi.mock("@/lib/server/assistant/authorize", () => ({ authorizeAssistant: vi.fn() }));
import { ASSISTANT_TOOLS } from "../assistant";
import { CONTENT_TOOLS } from "../content";
import type { AiToolContext } from "../define";
import { runTool } from "../define";

import type { AssistantCaller } from "@/lib/server/assistant/types";

export const session: AiToolContext & { caller: AssistantCaller } = { campaignId: "c", userId: "u", scopes: ["content:write"], threadId: null, caller: { actor: { campaignId: "c", userId: "u", via: "session", isDM: true, scopes: null }, channel: "chat", tokenId: null, threadId: null } };

const mcp: AiToolContext = { ...session, caller: { ...session.caller, actor: { ...session.caller.actor, via: "token", scopes: ["content:write"] }, channel: "mcp", tokenId: "verified" } };

const tool = (name: string) => {
  const found = ASSISTANT_TOOLS.find(t => t.name === name);

  if (!found) throw new Error(name);

  return found;
};

beforeEach(() => dispatch.mockClear());

it("chatAndMcpSamePayloadSameDomainResult", async () => {
  const payload = { actionId: "content.races.get", input: { id: "r" } };

  expect(await runTool(tool("assistant_read"), session, payload)).toEqual(await runTool(tool("assistant_read"), mcp, payload));
  expect(dispatch.mock.calls[0][0]).toEqual(session.caller);
  expect(dispatch.mock.calls[1][0]).toEqual(mcp.caller);
});
it("legacyContentAliasCannotBypassReview", async () => {
  dispatch.mockResolvedValueOnce({ kind: "pending", intent: { id: "i", status: "pending" }, reviewUrl: "/review" } as never);

  const result = JSON.parse(await runTool(CONTENT_TOOLS[4], mcp, { kind: "races", data: { name: "Elf" } }));

  expect(result.data.kind).toBe("pending");
  expect(dispatch.mock.calls[0][1]).toMatchObject({ actionId: "content.races.create", input: { data: { name: "Elf" } } });
});
it("noConfirmOrAutoTool", () => {
  expect(ASSISTANT_TOOLS.map(t => t.name).sort()).toEqual(["assistant_action", "assistant_capabilities", "assistant_read", "assistant_reject", "assistant_schema", "assistant_status"]);
});
it("readCannotDispatchWrite", async () => {
  const result = JSON.parse(await runTool(tool("assistant_read"), mcp, { actionId: "content.races.create", input: { data: {} } }));

  expect(result.kind).toBe("error");
  expect(dispatch).not.toHaveBeenCalled();
});
it("schemaAndDataPageValidJsonUnderLimit", async () => {
  const { clip } = await import("../define");

  const result = clip({ rows: Array.from({ length: 50 }, (_, i) => ({ id: i, text: "x".repeat(4000) })) });

  expect(result.length).toBeLessThanOrEqual(24000);
  expect(() => JSON.parse(result)).not.toThrow();

  const schema = JSON.parse(await runTool(tool("assistant_schema"), session, { actionId: "content.races.create" }));

  expect(schema.kind).toBe("result");
  expect(schema.data).toBeDefined();
});
it("legacyProposalsUseDispatcherAndPaidAliasFailsClosed", async () => {
  const { proposeScenarioEditTool } = await import("../propose");

  const { proposeSceneSlideTool } = await import("../propose-slide");

  const edit = await runTool(proposeScenarioEditTool, session, { pageId: "p", summary: "Edit", ops: [{ op: "renameSection", sectionId: "s", title: "Title" }] });

  expect(JSON.parse(edit).kind).toBe("result");
  expect(dispatch.mock.calls[0][1]).toMatchObject({ actionId: "scenario.propose-edit" });
  dispatch.mockClear();

  const paid = JSON.parse(await runTool(proposeSceneSlideTool, session, { pageId: "p", prompt: "Forest" }));

  expect(paid).toMatchObject({ kind: "error", error: { status: 409 } });
  expect(dispatch).not.toHaveBeenCalled();
});
it("rejectsForgedIdentityAndRunFields", async () => {
  const result = JSON.parse(await runTool(tool("assistant_action"), session, { actionId: "show.generate", input: {}, caller: mcp.caller, runId: "model" }));

  expect(result.kind).toBe("error");
  expect(dispatch).not.toHaveBeenCalled();
});
it("largePendingKeepsPendingIdentityAndReviewUrl", async () => {
  dispatch.mockResolvedValueOnce({ kind: "pending", intent: { id: "i", actionId: "content.units.delete-all", status: "pending", summary: "Delete", targets: Array.from({ length: 1000 }, (_, i) => ({ id: `${i}`, domain: "content", name: "x".repeat(200) })) }, reviewUrl: "/review" } as never);

  const text = await runTool(tool("assistant_action"), session, { actionId: "content.units.delete-all", input: {} });

  expect(text.length).toBeLessThanOrEqual(24000);
  expect(JSON.parse(text)).toMatchObject({ version: 2, data: { kind: "pending", intent: { id: "i", status: "pending" }, reviewUrl: "/review" } });
});
it("signedMediaNeverEntersToolOutputs", async () => {
  dispatch.mockResolvedValueOnce({ kind: "result", result: { data: { image: "https://storage.invalid/storage/v1/object/sign/slides/file?token=SECRET", notes: "See https://x.invalid/a?X-Amz-Signature=SECRET" }, affected: [], warnings: [] } } as never);

  const text = await runTool(tool("assistant_read"), session, { actionId: "show.get", input: {} });

  expect(text).not.toContain("SECRET");
  expect(JSON.parse(text).kind).toBe("result");
});
it.each(["HTTPS", "hTtPs"])("redacts signed URLs with %s scheme before tool output and context projection", async scheme => {
  const signed = `${scheme}://storage.invalid/storage/v1/object/sign/slides/file?token=PRIVATE_SIGNATURE`;

  dispatch.mockResolvedValueOnce({ kind: "result", result: { data: { image: signed }, affected: [], warnings: [] } } as never);

  const text = await runTool(tool("assistant_read"), session, { actionId: "show.get", input: {} });

  expect(JSON.parse(text)).toMatchObject({ kind: "result", data: { result: { data: { image: "[приховане посилання]" } } } });
  expect(text).not.toContain("PRIVATE_SIGNATURE");

  const { fitContext } = await import("@/lib/ai/context/budget");

  expect(fitContext([{ label: "Focus", value: { image: signed } }], 40000).text).not.toContain("PRIVATE_SIGNATURE");
});
it("escapedTextPagesStayBoundedAndAdvanceByOriginalCharacters", async () => {
  const { project } = await import("../projection");

  const original = "\u0000".repeat(30000);

  const page = project(original) as { text: string; nextOffset: number };

  expect(JSON.stringify(page).length).toBeLessThanOrEqual(10000);
  expect(page.nextOffset).toBe(page.text.length);
  expect(page.text).toBe(original.slice(0, page.nextOffset));
});
it("safeProjectionSanitizesBeforePagingAndPreservesJsonDates", async () => {
  const { project } = await import("../projection");

  const source = "x".repeat(7990) + " https://x.invalid/a?token=SECRET " + "y".repeat(20000);

  let offset = 0;

  let text = "";

  for (let i = 0; i < 10; i++) {
    const page = project(source, { offset }) as { text: string; nextOffset: number | null };

    text += page.text;

    if (page.nextOffset === null) break;

    offset = page.nextOffset;
  }
  expect(text).not.toContain("SECRET");

  const { defineTool } = await import("../define");

  const { z } = await import("zod");

  const def = defineTool({ name: "date", title: "date", description: "date", scopes: ["content:read"], input: z.object({}), handler: async () => ({ at: new Date(0) }) });

  expect(JSON.parse(await runTool(def, session, {})).data.at).toBe("1970-01-01T00:00:00.000Z");
});
