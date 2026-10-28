import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { poolAffordable, poolLeft } from "@/lib/utils/abilities/engine/core/usage";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { type ItemStats,itemStatsColumns } from "@/lib/utils/items/item-stats";
import { itemPools, withItemPool } from "@/lib/utils/items/pools";
import { parseRules } from "@/lib/utils/rules/schema";

const EXPEND = { id: "charge", name: "Expend a charge", trigger: { event: "action" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "note", text: "charge" }] };

const art = (id: string, name: string, slot: string, item: ItemStats, abilities: unknown[] = [EXPEND]) => ({ id, campaignId: "c1", name, slot, setId: null, icon: null, rarity: "uncommon", description: null, bonuses: {}, modifiers: itemStatsColumns(item).modifiers, abilities });

const ROWS = {
  wand: art("wand", "Wand of Magic Missiles", "item", { unique: false, charges: { max: 7, rest: "long" } }),
  dry: art("dry", "Dry Stone", "item", { unique: false }),
  ring: art("ring", "Ring of the Ram", "ring", { unique: false, attunement: true, charges: { max: 3, rest: null } }),
};

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Маг", level: 5,
  strength: 10, dexterity: 10, constitution: 10, intelligence: 16, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "mage", classes: [],
};

const build = (inventory: object, rules = parseRules({ items: { enabled: true } })) =>
  createBattleParticipantFromCharacter({ ...base, inventory } as never, "b1", ParticipantSide.ALLY, undefined, {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [], racesByName: { "Людина": null }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: ROWS, artifactSetsById: {}, artifactSetMemberIds: {}, rules,
  } as never);

describe("item charges pool", () => {
  it("withItemPool rewrites only the charges key; itemPools reads charges", () => {
    const list = withItemPool([EXPEND as never, { ...EXPEND, id: "x", limits: { pool: { key: "rage", cost: 1 } } } as never], "pool:item:wand");

    expect(list.map((a) => a.limits?.pool?.key)).toEqual(["pool:item:wand", "rage"]);
    expect(itemPools([ROWS.wand, ROWS.dry])).toEqual({ "pool:item:wand": { label: "Wand of Magic Missiles", max: 7, rest: "long" } });
  });

  it("carried wand: pool on the participant, expend lowers it", async () => {
    const p = await build({ equipped: {}, stash: ["wand"], attuned: [], items: [] });

    expect(p.battleData.pools).toEqual({ "pool:item:wand": { label: "Wand of Magic Missiles", max: 7, rest: "long" } });

    const ability = p.battleData.resolvedAbilities.find((a) => a.key === "artifact:wand:charge")!;

    expect(ability.limits?.pool?.key).toBe("pool:item:wand");

    const after = runAbilities([p], { type: "action", actorId: p.basicInfo.id, abilityKey: ability.key, targetIds: [] }, { round: 1, rng: seq(0.5) }).participants[0];

    expect(poolLeft(after, "pool:item:wand")).toBe(6);
  });

  it("charges key on an item without charges stays unresolved → unavailable", async () => {
    const p = await build({ equipped: {}, stash: ["dry"], attuned: [], items: [] });

    const ability = p.battleData.resolvedAbilities.find((a) => a.key === "artifact:dry:charge")!;

    expect(ability.limits?.pool?.key).toBe("charges");
    expect(poolAffordable(p, ability)).toBe(false);
  });

  it("an unattuned item has no pool", async () => {
    const p = await build({ equipped: {}, stash: ["ring"], attuned: [], items: [] });

    expect(p.battleData.pools).toBeUndefined();
    expect((await build({ equipped: {}, stash: ["ring"], attuned: ["ring"], items: [] })).battleData.pools).toEqual({ "pool:item:ring": { label: "Ring of the Ram", max: 3, rest: null } });
  });

  it("the same pool fires for every ability of the item (fixtures sanity)", () => {
    const a = resolved({ id: "a", trigger: { event: "action" }, limits: { pool: { key: "pool:item:w", cost: 2 } }, effects: [{ kind: "note", text: "x" }] }, { type: "artifact", id: "w" });

    const p = { ...makeParticipant({ id: "h", abilities: [a] }), battleData: { ...makeParticipant({ id: "h" }).battleData, resolvedAbilities: [a], pools: { "pool:item:w": { label: "W", max: 1, rest: null } } } };

    expect(poolAffordable(p, a)).toBe(false);
  });
});
