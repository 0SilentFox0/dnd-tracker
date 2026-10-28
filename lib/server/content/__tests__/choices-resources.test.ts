import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ race: { count: vi.fn(), create: vi.fn() }, gameClass: { create: vi.fn() }, spell: { create: vi.fn() } }));

const refs = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedRaces: vi.fn(async () => []), getCachedClasses: vi.fn(async () => []), getCachedSpells: vi.fn(async () => []) }));
vi.mock("@/lib/server/races/race-name", () => ({ raceNameTaken: vi.fn(async () => false) }));
vi.mock("@/lib/server/classes/class-name", () => ({ classNameTaken: vi.fn(async () => false) }));
vi.mock("@/lib/server/campaigns/campaign-refs", () => ({ assertCampaignRefs: refs, addedIds: (next: string[] | undefined, prev: unknown) => (next === undefined ? undefined : next.filter((id) => !(Array.isArray(prev) ? prev : []).includes(id))) }));

import { createClassSchema, createRaceSchema, createSpellSchema } from "@/lib/schemas";
import { classesResource } from "@/lib/server/content/resources/classes";
import { racesResource } from "@/lib/server/content/resources/races";
import { spellsResource } from "@/lib/server/content/resources/spells";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

describe("choices on owners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.race.count.mockResolvedValue(0);
  });

  it("race create writes choices and checks the spell refs of its options", async () => {
    const choices = [{ id: "l", label: "L", kind: "option", lineage: true, options: [{ id: "a", name: "A", spells: [{ level: 1, spellId: "sp1" }, { level: 3, spellId: "sp2" }] }] }];

    await racesResource.create(actor, createRaceSchema.parse({ name: "Elf", choices }));

    expect(db.race.create.mock.calls[0][0].data.choices).toMatchObject(choices);
    expect(refs).toHaveBeenCalledWith("c1", expect.objectContaining({ spell: ["sp1", "sp2"] }));
  });

  it("race without choices writes no choices key", async () => {
    await racesResource.create(actor, createRaceSchema.parse({ name: "Human" }));

    expect(db.race.create.mock.calls[0][0].data).not.toHaveProperty("choices");
  });

  it("class create writes spellList and feature choices", async () => {
    await classesResource.create(actor, createClassSchema.parse({ name: "Wizard", spellList: "Wizard", features: [{ level: 1, abilities: [], choices: [{ id: "c", label: "C", kind: "skill" }] }] }));

    expect(db.gameClass.create.mock.calls[0][0].data).toMatchObject({ spellList: "Wizard", features: [{ level: 1, choices: [{ id: "c" }] }] });
  });

  it("spell create writes lists only when given", async () => {
    db.spell.create.mockResolvedValue({ id: "s1" });

    await spellsResource.create(actor, createSpellSchema.parse({ name: "Fire Bolt", lists: ["Wizard"] }));
    await spellsResource.create(actor, createSpellSchema.parse({ name: "Old" }));

    expect(db.spell.create.mock.calls[0][0].data.lists).toEqual(["Wizard"]);
    expect(db.spell.create.mock.calls[1][0].data).not.toHaveProperty("lists");
  });
});
