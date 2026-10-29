import { expect, it, vi } from "vitest";
import { z } from "zod";
vi.mock("@/lib/db", () => ({ prisma: {} }));
import { registerMcpTools } from "@/lib/ai/tools";
import { defineTool } from "@/lib/ai/tools/define";
it("toolErrorNotSuccess", async () => {
  const registerTool = vi.fn();

  const def = defineTool({ name: "bad", title: "bad", description: "bad", scopes: ["ai"], input: z.object({}), handler: async () => { throw new Error("secret"); } });

  registerMcpTools({ registerTool } as never, [def], { campaignId: "c", userId: "u", threadId: null, scopes: ["ai"], locale: "uk" as const });

  const output = await registerTool.mock.calls[0][2]({});

  expect(output.isError).toBe(true);

  const result = JSON.parse(output.content[0].text);

  expect(result).toMatchObject({ version: 2, kind: "error", error: { status: 500 } });
  expect(JSON.stringify(result)).not.toContain("secret");
});
it.each(["pending", "handoff"])("%s is a successful non-mutation result", async kind => {
  const registerTool = vi.fn();

  const def = defineTool({ name: "prepare", title: "prepare", description: "prepare", scopes: ["show:write"], input: z.object({}), handler: async () => ({ kind, ...(kind === "pending" ? { intent: { id: "i", status: "pending", targets: [] }, reviewUrl: "/review" } : { href: "/editor", reason: "human" }) }) });

  registerMcpTools({ registerTool } as never, [def], { campaignId: "c", userId: "u", threadId: null, scopes: ["show:write"], locale: "uk" as const });

  const output = await registerTool.mock.calls[0][2]({});

  expect(output.isError).toBe(false);
  expect(JSON.parse(output.content[0].text)).toMatchObject({ version: 2, kind: "result", data: { kind } });
  expect(output.content[0].text).not.toContain('"status":"applied"');
});
