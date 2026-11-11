import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const h = vi.hoisted(() => ({ rules: { tables: { critHead: [{ max: 100, text: "x", effects: [] }], mutationPhysical: [{ max: 100, effects: [{ type: "move", amount: -1 }] }] } } as Record<string, unknown> }));

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: { findUnique: vi.fn(async () => ({ rules: h.rules })) },
    character: { count: async () => 0 },
    unit: { count: async () => 0 },
  },
}));

import { loadRules, readCampaignRules, updateCampaignRules } from "../rules";

import { ContentError } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";
import { stripPlayerHiddenRules } from "@/lib/utils/rules/player-hidden";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";

const dm: Actor = { campaignId: "c1", userId: "u1", isDM: true, via: "session", scopes: null };

const player: Actor = { ...dm, isDM: false };

describe("rules.tables visibility", () => {
  it("DM reads tables", async () => {
    expect((await readCampaignRules(dm)).tables.critHead).toHaveLength(1);
  });

  it("player reads rules without tables", async () => {
    const view = await readCampaignRules(player);

    expect(view.tables).toEqual({});
    expect(view.system).toBeDefined();
  });

  it("server engine loadRules keeps tables", async () => {
    expect((await loadRules("c1")).tables.critHead).toHaveLength(1);
  });

  it("player cannot PATCH rules", async () => {
    await expect(updateCampaignRules(player, RulesetPatchSchema.parse({}))).rejects.toBeInstanceOf(ContentError);
  });

  it("stripPlayerHiddenRules only clears tables", async () => {
    const rules = await loadRules("c1");

    expect(stripPlayerHiddenRules(rules)).toEqual({ ...rules, tables: {} });
    expect(stripPlayerHiddenRules(rules).tables.mutationPhysical).toBeUndefined();
  });
});
