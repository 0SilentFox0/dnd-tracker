import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  $transaction: async (callback: (tx: object) => unknown) => callback({ $queryRaw: async () => [{ id: "c1" }] }),
  artifact: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  artifactSet: { findFirst: vi.fn() },
  refs: vi.fn(async () => undefined),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/server/campaigns/campaign-refs", () => ({ assertCampaignRefs: db.refs }));

import { artifactsResource } from "@/lib/server/content/resources/artifacts";
import { createContent, updateContent } from "@/lib/server/content/service";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const ITEM = { type: "itemStats", value: JSON.stringify({ unique: false }) };

describe("artifact item persistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create writes weapon and item records together", async () => {
    db.artifact.create.mockResolvedValue({ id: "a1" });

    await createContent(artifactsResource, actor, { name: "Dagger", slot: "weapon", weapon: { damageDice: "1d4" }, item: { unique: false } });

    expect(db.artifact.create.mock.calls[0][0].data.modifiers).toEqual([{ type: "damageDice", value: "1d4" }, ITEM]);
  });

  it("validates item spell references against the current campaign", async () => {
    db.artifact.create.mockResolvedValue({ id: "wand" });
    await createContent(artifactsResource, actor, { name: "Wand", slot: "item", item: { charges: { max: 3, rest: "long" }, spells: [{ spellId: "spell-local", cost: 1, castLevel: 1 }] } });
    expect(db.refs).toHaveBeenCalledWith("c1", { artifactSet: undefined, spell: ["spell-local"] });
  });

  const patch = async (existing: object, data: object) => {
    db.artifact.findFirst.mockResolvedValue({ id: "a1", campaignId: "c1", icon: null, slot: "weapon", ...existing });
    db.artifact.update.mockResolvedValue({ id: "a1" });
    await updateContent(artifactsResource, actor, "a1", data);

    return db.artifact.update.mock.calls[0][0].data;
  };

  it("PATCH weapon keeps the item record; PATCH item keeps weapon records", async () => {
    expect((await patch({ modifiers: [{ type: "damageDice", value: "1d4" }, ITEM] }, { weapon: { damageDice: "1d6" } })).modifiers).toEqual([{ type: "damageDice", value: "1d6" }, ITEM]);

    vi.clearAllMocks();

    expect((await patch({ modifiers: [{ type: "damageDice", value: "1d4" }, ITEM] }, { item: { unique: false, attunement: true } })).modifiers).toEqual([
      { type: "damageDice", value: "1d4" },
      { type: "itemStats", value: JSON.stringify({ unique: false, attunement: true }) },
    ]);
  });

  it("PATCH item null drops only the item record; untouched item keeps modifiers as is", async () => {
    expect((await patch({ modifiers: [{ type: "damageDice", value: "1d4" }, ITEM] }, { item: null })).modifiers).toEqual([{ type: "damageDice", value: "1d4" }]);

    vi.clearAllMocks();

    expect(await patch({ modifiers: [ITEM] }, { name: "X" })).not.toHaveProperty("modifiers");
  });
});
