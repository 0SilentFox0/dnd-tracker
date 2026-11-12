import { describe, expect, it, vi } from "vitest";

describe("D20_MODULE_SERVER.battle", () => {
  it("crit-choice loads its schema and mutation", async () => {
    await import("@/lib/server/systems/registry");

    const { D20_MODULE_SERVER } = await import("../../server");

    const op = await D20_MODULE_SERVER.battle?.["crit-choice"].load({ attack: vi.fn(), spell: vi.fn() });

    expect(op?.schema.safeParse({ cancel: true }).success).toBe(true);
    expect(typeof op?.mutate).toBe("function");
  });
});
