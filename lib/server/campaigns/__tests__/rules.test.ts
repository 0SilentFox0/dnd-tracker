import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const h = vi.hoisted(() => ({
  rules: {} as Record<string, unknown>,
  usage: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(async () => ({ rules: h.rules })),
      update: vi.fn(async ({ data }: { data: { rules: Record<string, unknown> } }) => {
        h.rules = data.rules;
        h.update(data);
      }),
    },
  },
}));
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: (_id: string, fn: (tx: unknown) => unknown) => fn({}) }));
vi.mock("../condition-usage", async (orig) => ({ ...(await orig<typeof import("../condition-usage")>()), findCustomConditionUsage: h.usage }));

import { readCustomConditionUsage, updateCampaignRules } from "../rules";

import { ContentError } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";

const dm: Actor = { campaignId: "c1", userId: "u1", isDM: true, via: "session", scopes: null };

const player: Actor = { ...dm, isDM: false };

const EMPTY = { battles: [], spells: [], units: [], skills: [], artifacts: [], artifactSets: [], races: [], feats: [], statusEffects: [] };

const status = async (p: Promise<unknown>) => {
  try {
    await p;

    return 200;
  } catch (e) {
    return e instanceof ContentError ? e.status : -1;
  }
};

const remove = (...keys: string[]) => RulesetPatchSchema.parse({ removeCustomConditions: keys });

beforeEach(() => {
  h.rules = { conditions: { enabled: true, exhaustion: "2014", custom: [{ key: "custom:a", name: "Alpha", description: "", markers: [] }] } };
  h.usage.mockReset().mockResolvedValue(EMPTY);
  h.update.mockReset();
});

describe("updateCampaignRules removeCustomConditions", () => {
  it("409 with the condition name when it is in use", async () => {
    h.usage.mockResolvedValue({ ...EMPTY, spells: [{ id: "s1", name: "X" }] });

    await expect(updateCampaignRules(dm, remove("custom:a"))).rejects.toMatchObject({ status: 409, params: { name: "Alpha" } });
    expect(h.update).not.toHaveBeenCalled();
  });

  it("removes an unused condition", async () => {
    const rules = await updateCampaignRules(dm, remove("custom:a"));

    expect(rules.conditions.custom).toEqual([]);
    expect(h.update).toHaveBeenCalledOnce();
  });

  it("is idempotent for an already removed key", async () => {
    await updateCampaignRules(dm, remove("custom:a"));

    expect(await status(updateCampaignRules(dm, remove("custom:a")))).toBe(200);
  });
});

describe("readCustomConditionUsage", () => {
  it("403 for a non-DM", async () => expect(await status(readCustomConditionUsage(player, "a"))).toBe(403));

  it("400 for an invalid slug", async () => expect(await status(readCustomConditionUsage(dm, "Bad Slug"))).toBe(400));

  it("404 for a key missing in the rules", async () => expect(await status(readCustomConditionUsage(dm, "zzz"))).toBe(404));

  it("returns the usage for a known key", async () => {
    h.usage.mockResolvedValue({ ...EMPTY, units: [{ id: "u1", name: "Орк" }] });

    expect(await readCustomConditionUsage(dm, "a")).toMatchObject({ units: [{ id: "u1" }] });
  });
});
