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
});
