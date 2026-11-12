import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { levelUpOperation } from "@/systems/d20/server/operations/level-up";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

describe("level-up system gate", () => {
  it("rejects systems without levels", async () => {
    const gate = { access: { campaign: { rules: WFRP_RULES } }, character: { id: "c1", campaignId: "k1" } };

    await expect((levelUpOperation.run as (g: unknown, i: unknown) => Promise<unknown>)(gate, {})).rejects.toSatisfy((e) => e instanceof ContentError && e.status === 409 && e.message === API_ERRORS.SYSTEM_LEVELS_UNSUPPORTED);
  });
});
