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

  it("кожен інструмент має scopes; наявні — ai", async () => {
    const { AI_TOOLS, toolsFor } = await import("@/lib/ai/tools");

    for (const t of AI_TOOLS) expect(t.scopes.length).toBeGreaterThan(0);
    expect(toolsFor(["ai"]).map((t) => t.name)).toContain("search_reference");
  });

  it("content:read не бачить ai-інструментів", async () => {
    const { toolsFor } = await import("@/lib/ai/tools");

    expect(toolsFor(["content:read"]).some((t) => t.name === "search_reference")).toBe(false);
  });

  it("toAiSdkTools і registerMcpTools покривають усі інструменти", async () => {
    const { AI_TOOLS, registerMcpTools, toAiSdkTools, toolsFor } = await import("@/lib/ai/tools");

    const ctx = { campaignId: "c", userId: "u", scopes: ["ai", "content:write"] as const, threadId: null };

    const chatCtx = { ...ctx, scopes: ["ai"] as const };

    expect(Object.keys(toAiSdkTools(chatCtx)).sort()).toEqual(toolsFor(["ai"]).map((t) => t.name).sort());
    expect(Object.keys(toAiSdkTools(chatCtx)).some((n) => n.startsWith("content_"))).toBe(false);

    const registerTool = vi.fn();

    registerMcpTools({ registerTool } as never, toolsFor(ctx.scopes), ctx);
    expect(registerTool.mock.calls.map((c) => c[0]).sort()).toEqual(AI_TOOLS.map((t) => t.name).sort());
  });

  it("runTool: AiToolError → текст, обрізання довгих результатів", async () => {
    const { AiToolError, clip, defineTool, runTool } = await import("@/lib/ai/tools/define");

    const { z } = await import("zod");

    const failing = defineTool({
      name: "x",
      scopes: ["ai"],
      title: "x",
      description: "x",
      input: z.object({}),
      handler: async () => {
        throw new AiToolError("нема");
      },
    });

    expect(await runTool(failing, { campaignId: "c", userId: "u", scopes: ["ai"] as const, threadId: null }, {})).toBe("Помилка: нема");
    expect(clip("a".repeat(30_000))).toMatch(/…\[обрізано\]$/);
  });

  it("runTool: невідома помилка → загальний текст для будь-якого інструмента", async () => {
    const { defineTool, runTool } = await import("@/lib/ai/tools/define");

    const { z } = await import("zod");

    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const boom = defineTool({ name: "boom", scopes: ["ai"], title: "t", description: "d", input: z.object({}), handler: async () => { throw new Error("secret prisma"); } });

    const text = await runTool(boom, { campaignId: "c", userId: "u", scopes: ["ai"] as const, threadId: null }, {});

    expect(text).toMatch(/^Помилка: Внутрішня/);
    expect(text).not.toContain("secret");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
