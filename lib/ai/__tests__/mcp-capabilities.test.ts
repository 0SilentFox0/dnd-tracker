import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAssistant: vi.fn(),
  findCampaign: vi.fn(),
  listPages: vi.fn(),
  listWorldMaps: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { campaign: { findUnique: mocks.findCampaign } } }));
vi.mock("@/lib/server/assistant/authorize", () => ({ authorizeAssistant: mocks.authorizeAssistant }));
vi.mock("@/lib/server/scenario/page-store", () => ({ listPages: mocks.listPages }));
vi.mock("@/lib/server/world/map-store", () => ({ listWorldMaps: mocks.listWorldMaps }));

import { registerMcpCapabilities } from "@/lib/ai/mcp-capabilities";

const caller = {
  actor: { campaignId: "campaign-1", userId: "dm-1", isDM: true, via: "token", scopes: ["campaign:read", "scenario:read", "world:read"] },
  channel: "mcp", threadId: null, tokenId: "token-1", locale: "en",
} as never;

function mockServer() {
  const resources = new Map<string, (uri: URL) => Promise<unknown>>();

  const prompts = new Map<string, { config: unknown; handler: (args: Record<string, string>) => unknown }>();

  const server = {
    registerResource: vi.fn((name: string, _uri: string, _metadata: unknown, handler: (uri: URL) => Promise<unknown>) => resources.set(name, handler)),
    registerPrompt: vi.fn((name: string, config: unknown, handler: (args: Record<string, string>) => unknown) => prompts.set(name, { config, handler })),
  };

  return { server, resources, prompts };
}

function context(scopes: readonly ("campaign:read" | "scenario:read" | "world:read")[]) {
  return { caller, campaignId: "campaign-1", userId: "dm-1", scopes, threadId: null, locale: "en" as const };
}

describe("MCP resources and prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findCampaign.mockResolvedValue({ name: "The Vale", description: "A campaign", aiInstructions: "Keep canon" });
    mocks.listPages.mockResolvedValue([{ id: "page-1", title: "Arrival", kind: "scene", arc: "A", status: "active" }]);
    mocks.listWorldMaps.mockResolvedValue([{ id: "map-1", name: "The Vale" }]);
  });

  it("exposes only the DM resources and prompts allowed by the token scopes", () => {
    const { server, resources, prompts } = mockServer();

    registerMcpCapabilities(server as never, context(["world:read"]));

    expect([...resources.keys()]).toEqual(["world_map_index"]);
    expect([...prompts.keys()]).toEqual(["summarize_world_travel"]);
    expect(server.registerResource).toHaveBeenCalledTimes(1);
  });

  it("re-authorizes resource reads and returns bounded campaign data", async () => {
    const { server, resources } = mockServer();

    registerMcpCapabilities(server as never, context(["campaign:read"]));

    const handler = resources.get("campaign_brief");

    expect(handler).toBeDefined();

    if (!handler) throw new Error("campaign brief resource was not registered");

    const result = await handler(new URL("dnd://campaign/campaign-1/brief")) as { contents: Array<{ text: string }> };

    expect(mocks.authorizeAssistant).toHaveBeenCalledWith(caller, { access: "dm", scope: "campaign:read" }, "prepare");
    expect(JSON.parse(result.contents[0].text)).toEqual({ name: "The Vale", description: "A campaign", instructions: "Keep canon" });
  });

  it("limits resource contents and prompts contain workflow guidance without campaign data", async () => {
    mocks.listPages.mockResolvedValue(Array.from({ length: 100 }, (_, index) => ({ id: `page-${index}`, title: "N".repeat(300), kind: "scene", arc: "A".repeat(100), status: "active" })));

    const { server, resources, prompts } = mockServer();

    registerMcpCapabilities(server as never, context(["campaign:read", "scenario:read"]));

    const resourceHandler = resources.get("scenario_index");

    const prepareSession = prompts.get("prepare_session");

    if (!resourceHandler || !prepareSession) throw new Error("expected campaign resources and prompt to be registered");

    const resource = await resourceHandler(new URL("dnd://campaign/campaign-1/scenario-index")) as { contents: Array<{ text: string }> };

    const prompt = prepareSession.handler({ goal: "Next session" }) as { messages: Array<{ content: { text: string } }> };

    expect(resource.contents[0].text.length).toBeLessThanOrEqual(18_000);
    expect(JSON.parse(resource.contents[0].text)).toMatchObject({ truncated: true });
    expect(prompt.messages[0].content.text).toContain("Next session");
    expect(prompt.messages[0].content.text).toContain("Read the campaign brief");
    expect(prompt.messages[0].content.text).not.toContain("The Vale");
  });

  it("does not register capabilities for a non-MCP or mismatched caller", () => {
    const { server, resources, prompts } = mockServer();

    registerMcpCapabilities(server as never, { ...context(["campaign:read", "scenario:read", "world:read"]), caller: { ...(caller as object), channel: "chat" } as never });

    expect(resources.size).toBe(0);
    expect(prompts.size).toBe(0);
  });
});
