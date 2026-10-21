import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

describe("AI tool registry", () => {
  it("імена унікальні, snake_case, є опис", async () => {
    const { AI_TOOLS } = await import("@/lib/ai/tools");

    const names = AI_TOOLS.map((t) => t.name);

    expect(new Set(names).size).toBe(names.length);
    names.forEach((n) => expect(n).toMatch(/^[a-z][a-z_]+$/));
    AI_TOOLS.forEach((t) => expect(t.description.length).toBeGreaterThan(20));
  });

  it("toAiSdkTools і registerMcpTools покривають усі інструменти", async () => {
    const { AI_TOOLS, registerMcpTools, toAiSdkTools } = await import("@/lib/ai/tools");

    const ctx = { campaignId: "c", userId: "u", threadId: null };

    expect(Object.keys(toAiSdkTools(ctx)).sort()).toEqual(AI_TOOLS.map((t) => t.name).sort());

    const registerTool = vi.fn();

    registerMcpTools({ registerTool } as never, ctx);
    expect(registerTool.mock.calls.map((c) => c[0]).sort()).toEqual(AI_TOOLS.map((t) => t.name).sort());
  });

  it("runTool: AiToolError → текст, обрізання довгих результатів", async () => {
    const { AiToolError, clip, defineTool, runTool } = await import("@/lib/ai/tools/define");

    const { z } = await import("zod");

    const failing = defineTool({
      name: "x",
      title: "x",
      description: "x",
      input: z.object({}),
      kind: "read",
      handler: async () => {
        throw new AiToolError("нема");
      },
    });

    expect(await runTool(failing, { campaignId: "c", userId: "u", threadId: null }, {})).toBe("Помилка: нема");
    expect(clip("a".repeat(30_000))).toMatch(/…\[обрізано\]$/);
  });
});
