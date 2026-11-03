import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAssistant: vi.fn(),
  dispatchAction: vi.fn(),
  readWorldMapDetail: vi.fn(),
  listHeroesOnMap: vi.fn(),
  listPublicMapNotes: vi.fn(),
  listWorldMaps: vi.fn(),
  readTravelLog: vi.fn(),
}));

vi.mock("@/lib/server/assistant/authorize", () => ({ authorizeAssistant: mocks.authorizeAssistant }));
vi.mock("@/lib/server/assistant/execute", () => ({ dispatchAction: mocks.dispatchAction }));
vi.mock("@/lib/server/world/map-store", () => ({ listWorldMaps: mocks.listWorldMaps, readWorldMapDetail: mocks.readWorldMapDetail }));
vi.mock("@/lib/server/world/note-store", () => ({ listPublicMapNotes: mocks.listPublicMapNotes }));
vi.mock("@/lib/server/world/travel-store", () => ({ listHeroesOnMap: mocks.listHeroesOnMap, readTravelLog: mocks.readTravelLog }));

import { runToolResult } from "../define";
import { getWorldMapTool,worldActionTool } from "../world";

const caller = {
  actor: { campaignId: "campaign-1", userId: "dm-1", isDM: true, via: "token", scopes: ["world:read", "world:write"] },
  channel: "mcp", threadId: null, tokenId: "token-1", locale: "en",
} as never;

const ctx = { caller, campaignId: "campaign-1", userId: "dm-1", scopes: ["world:read", "world:write"] as const, threadId: null, locale: "en" as const };

describe("world MCP tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorizeAssistant.mockResolvedValue(undefined);
    mocks.listHeroesOnMap.mockResolvedValue([]);
    mocks.listPublicMapNotes.mockResolvedValue([]);
  });

  it("rejects map details belonging to a different campaign before reading related data", async () => {
    mocks.readWorldMapDetail.mockResolvedValue({ id: "foreign-map", campaignId: "campaign-2", name: "Private map" });

    const result = await runToolResult(getWorldMapTool, ctx, { mapId: "foreign-map" });

    expect(result).toMatchObject({ kind: "error", error: { status: 422 } });
    expect(mocks.listHeroesOnMap).not.toHaveBeenCalled();
    expect(mocks.listPublicMapNotes).not.toHaveBeenCalled();
  });

  it("requires DM write authorization and dispatches writes through the confirmation workflow", async () => {
    const pending = { kind: "pending", intent: { id: "intent-1", status: "pending" }, reviewUrl: "/assistant/review" };

    mocks.dispatchAction.mockResolvedValue(pending);

    const result = await worldActionTool.handler(ctx, { operation: "markers.create", input: { mapId: "map-1", name: "Old bridge" } });

    expect(mocks.authorizeAssistant).toHaveBeenCalledWith(caller, { access: "dm", scope: "world:write" }, "prepare");
    expect(mocks.dispatchAction).toHaveBeenCalledWith(caller, expect.objectContaining({ actionId: "world.markers.create", input: { mapId: "map-1", name: "Old bridge" } }), undefined);
    expect(result).toEqual(pending);
  });

  it("rejects unknown world operations and extra top-level arguments", async () => {
    const unknownOperation = await runToolResult(worldActionTool, ctx, { operation: "maps.publish", input: {} });

    const extraArgument = await runToolResult(worldActionTool, ctx, { operation: "maps.create", input: {}, campaignId: "campaign-2" });

    expect(unknownOperation).toMatchObject({ kind: "error", error: { code: "INVALID_INPUT", status: 400 } });
    expect(extraArgument).toMatchObject({ kind: "error", error: { code: "INVALID_INPUT", status: 400 } });
    expect(mocks.dispatchAction).not.toHaveBeenCalled();
  });
});
