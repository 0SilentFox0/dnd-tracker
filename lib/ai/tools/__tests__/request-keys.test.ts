import { describe, expect, it, vi } from "vitest";

import { toAiSdkTools } from "@/lib/ai/tools";
import { API_TOKEN_SCOPES } from "@/lib/constants/ai";
import { assistantRequestSchema } from "@/lib/schemas/assistant";
import { dispatchAction } from "@/lib/server/assistant/execute";
import type { AssistantCaller } from "@/lib/server/assistant/types";

vi.mock("@/lib/server/assistant/execute", () => ({ dispatchAction: vi.fn(async () => ({ kind: "result", result: { data: {}, affected: [], warnings: [] } })) }));

const caller: AssistantCaller = { actor: { campaignId: "c", userId: "u", isDM: true, via: "session", scopes: null }, channel: "chat", threadId: "t", tokenId: null, runId: "cm123456789012345678901234" };

describe("trusted SDK tool request keys", () => {
  it.each([
    ["assistant_action", { actionId: "campaign.patch", input: {} }],
    ["content_create", { kind: "units", data: { name: "Test" } }],
    ["propose_scenario_edit", { pageId: "p", summary: "Test", ops: [{ op: "renameSection", sectionId: "s", title: "New" }] }],
  ])("%s reuses SDK toolCallId under the server run, with a schema-valid key", async (name, input) => {
    vi.mocked(dispatchAction).mockClear();

    const tools = toAiSdkTools({ caller, campaignId: "c", userId: "u", threadId: "t", scopes: API_TOKEN_SCOPES });

    const execute = tools[String(name)].execute;

    if (!execute) throw new Error("Missing tool");

    await execute(input, { toolCallId: "call-1", messages: [], context: undefined });
    await execute(input, { toolCallId: "call-1", messages: [], context: undefined });

    const calls = vi.mocked(dispatchAction).mock.calls;

    expect(calls).toHaveLength(2);
    expect(calls[0][1].requestId).toBe(calls[1][1].requestId);
    expect(calls[0][1].requestId).toMatch(/^cm123456789012345678901234_/);
    expect(assistantRequestSchema.safeParse(calls[0][1]).success).toBe(true);
    await execute(input, { toolCallId: "call-2", messages: [], context: undefined });
    expect(calls[2][1].requestId).not.toBe(calls[0][1].requestId);
  });
});
