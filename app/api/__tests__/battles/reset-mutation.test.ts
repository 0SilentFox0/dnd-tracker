import { describe, expect, it } from "vitest";

import { context } from "./fixtures";

import { resetMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/reset/reset-mutation";

describe("reset mutation", () => {
  it("повертає бій у prepared, прибирає учасників і весь журнал", () => {
    const out = resetMutation(context());

    expect(out.participants).toEqual([]);
    expect(out.pending).toEqual([]);
    expect(out.scene).toEqual({ status: "prepared", round: 1, turnIndex: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null });
    expect(out.history).toEqual({ clear: true });
  });

  it("прибирає барʼєри з карти (вони лише для бою), решту місцевості лишає", () => {
    const map = { cols: 8, rows: 8, background: null, opacity: 0.3 };

    const terrain = { "1:1": { kind: "barrier" as const, untilRound: 5 }, "2:2": { kind: "wall" as const } };

    const ctx = context();

    const out = resetMutation({ ...ctx, meta: { ...ctx.meta, map: { ...map, terrain } } });

    expect(out.scene?.map).toEqual({ ...map, terrain: { "2:2": { kind: "wall" } } });
    expect(resetMutation({ ...ctx, meta: { ...ctx.meta, map } }).scene).not.toHaveProperty("map");
  });
});
