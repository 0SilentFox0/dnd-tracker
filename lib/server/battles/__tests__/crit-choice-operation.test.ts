import { describe, expect, it, vi } from "vitest";

import { DEFAULT_RULES } from "@/lib/utils/rules";

vi.mock("server-only", () => ({}));

describe("crit-choice operation resolves by the battle composition", () => {
  it("answers CRIT_CHOICE_NONE for a d20 battle without a pending crit", async () => {
    const { getBattleOperation } = await import("@/lib/server/battles/operations");

    const def = await getBattleOperation("crit-choice", { id: "c", battleId: "b" });

    const ctx = { meta: { rules: DEFAULT_RULES }, scene: { pendingChoice: null, round: 1 }, participants: [], pending: null } as never;

    await expect(def.mutate(ctx, { cancel: true } as never)).rejects.toThrow("errors.critChoiceNone");
  });

  it("answers CRIT_CHOICE_NONE when the battle composition has no such operation", async () => {
    const { getBattleOperation } = await import("@/lib/server/battles/operations");

    const def = await getBattleOperation("crit-choice", { id: "c", battleId: "b" });

    const rules = { ...DEFAULT_RULES, system: { key: "wfrp" } };

    await expect(def.mutate({ meta: { rules } } as never, { cancel: true } as never)).rejects.toThrow("errors.critChoiceNone");
  });
});
