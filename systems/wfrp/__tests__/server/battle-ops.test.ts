import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("WFRP_MODULE_SERVER.battle", () => {
  it("channel loads its schema and mutation", async () => {
    const { WFRP_MODULE_SERVER } = await import("../../server");

    const op = await WFRP_MODULE_SERVER.battle?.channel.load({ attack: vi.fn(), spell: vi.fn() });

    expect(op?.schema.safeParse({ participantId: "hero", roll: 20 }).success).toBe(true);
    expect(typeof op?.mutate).toBe("function");
  });

  it("the channel route resolves by the battle composition and rejects d20", async () => {
    const { getBattleOperation } = await import("@/lib/server/battles/operations");

    const { DEFAULT_RULES } = await import("@/lib/utils/rules");

    const def = await getBattleOperation("channel", { id: "c", battleId: "b" });

    await expect(def.mutate({ meta: { rules: DEFAULT_RULES } } as never, { participantId: "hero" } as never)).rejects.toThrow("errors.battleChannelUnsupported");
  });
});
