import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { createStartMutation } from "../start-mutation";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const ctxOf = (rules: typeof DEFAULT_RULES) => ({ scene: { id: "s1", campaignId: "c1" }, meta: { setup: [{ id: "p1" }], map: null, rules } }) as unknown as BattleMutationContext;

describe("start battle system gate", () => {
  it("rejects a system without battle support before building", async () => {
    const build = vi.fn();

    await expect(createStartMutation(build)(ctxOf(WFRP_RULES))).rejects.toSatisfy((e) => e instanceof ContentError && e.status === 409 && e.message === API_ERRORS.SYSTEM_BATTLE_UNSUPPORTED);
    expect(build).not.toHaveBeenCalled();
  });

  it("builds for d20 systems", async () => {
    const build = vi.fn().mockResolvedValue({ order: [{ basicInfo: { id: "p1" } }], reserve: [], triggerLogEntries: [] });

    await createStartMutation(build)(ctxOf(DEFAULT_RULES));

    expect(build).toHaveBeenCalledOnce();
  });
});
