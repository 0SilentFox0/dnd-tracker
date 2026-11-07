import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { refreshFromSource } from "@/lib/utils/battle/participant/refresh-from-source";
import { parseRules } from "@/lib/utils/rules/schema";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { armourSl } from "@/lib/utils/rules/systems/wfrp/magic/armour";
import { ARMOUR_SL_PER_AP } from "@/lib/utils/rules/systems/wfrp/magic/constants";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const character = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 1,
  strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 1, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "ranger",
};

const context = {
  skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [],
  racesByName: { "Людина": { id: "r", campaignId: "c1", name: "Людина", icon: null, color: null, availableSkills: [], disabledSkills: [], spellSlotProgression: [], passiveAbility: null, abilities: [] } },
  campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {},
} as never;

const build = (over: object, rules = parseRules(WFRP_RULES)) =>
  createBattleParticipantFromCharacter({ ...character, ...over } as never, "b1", ParticipantSide.ALLY, undefined, context, { artifactRows: [], rules });

const stat = (type: string, extra: object) => ({ type, weight: 1, price: 1, ...extra });

const mail = stat("armour", { locations: { head: 0, arm: 1, body: 3, leg: 1 }, kind: "mail", qualities: [] });

const flexLeather = stat("armour", { locations: { head: 0, arm: 0, body: 1, leg: 0 }, kind: "soft", qualities: [{ key: "flexible" }] });

const buckler = stat("gear", { qualities: [{ key: "shield", value: 1 }] });

const row = (id: string, slot: string, systemStats: unknown) => ({ row: { id, campaignId: "c1", name: id, slot, setId: null, icon: null, rarity: null, description: null, bonuses: {}, modifiers: [], abilities: [], systemStats }, slot });

const withGear = (rows: ReturnType<typeof row>[]) =>
  createBattleParticipantFromCharacter({ ...character, inventory: { equipped: {}, backpack: [], items: [], stash: [] } } as never, "b1", ParticipantSide.ALLY, undefined, context, { artifactRows: rows as never, rules: parseRules(WFRP_RULES) });

describe("participant: WFRP equipment", () => {
  it("equipped mail and shield give AP per location", async () => {
    const p = await withGear([row("m", "armor", mail), row("s", "shield", buckler)]);

    expect(p.abilities.wfrp?.ap).toEqual({ head: 1, arm: 2, body: 4, leg: 1 });
    expect(p.abilities.wfrp).not.toHaveProperty("flexible");
    expect(armourSl(p)).toBe(ARMOUR_SL_PER_AP * 4);
  });

  it("all-flexible armour sets the flag and cancels the armour penalty", async () => {
    const p = await withGear([row("f", "armor", flexLeather)]);

    expect(p.abilities.wfrp).toMatchObject({ flexible: true, ap: { body: 1 } });
    expect(armourSl(p)).toBe(0);
  });

  it("no gear, garbage stats or stats missing leave AP at zero", async () => {
    for (const rows of [[], [row("g", "armor", { type: "armour" })], [row("n", "armor", null)]]) {
      const p = await withGear(rows);

      expect(p.abilities.wfrp?.ap).toEqual({ head: 0, arm: 0, body: 0, leg: 0 });
    }
  });

  it("equipped bow becomes a wfrp attack with seeded ammo; the sword carries its flat damage", async () => {
    const weapon = (extra: object) => stat("weapon", { group: "basic", damage: { addSb: true, flat: 4 }, qualities: [], flaws: [], twoHanded: false, ...extra });

    const p = await withGear([row("sw", "weapon", weapon({ reach: "average" })), row("bw", "range_weapon", weapon({ group: "bow", range: 60, ammoCapacity: 20, flaws: [{ key: "reload", value: 1 }] }))]);

    expect(p.battleData.attacks.find((a) => a.id === "sw")).toMatchObject({ damageDice: "", damageBonus: 4, wfrp: { qualities: [] } });
    expect(p.battleData.attacks.find((a) => a.id === "bw")).toMatchObject({ wfrp: { ammoCapacity: 20, reload: 1 } });
    expect(p.battleData.ammo).toEqual({ bw: 20 });
  });

  it("d20 system ignores systemStats", async () => {
    const p = await createBattleParticipantFromCharacter({ ...character, inventory: { equipped: {}, backpack: [], items: [], stash: [] } } as never, "b1", ParticipantSide.ALLY, undefined, context, { artifactRows: [row("m", "armor", mail)] as never, rules: parseRules({}) });

    expect(p.abilities).not.toHaveProperty("wfrp");
  });
});

describe("participant: WFRP characteristics", () => {
  it("SB/TB/move from characteristics; AP zero for every location", async () => {
    const p = await build({ characteristics: { base: { s: 45, t: 38 }, advances: { s: 5 }, move: 5 } });

    expect(p.abilities.wfrp).toEqual({ sb: 5, ag: 30, tb: 3, ap: { head: 0, arm: 0, body: 0, leg: 0 } });
    expect(p.abilities.characteristics?.move).toBe(5);
  });

  it("initiative is the I characteristic and speed is walk yards * 3 ft", async () => {
    const p = await build({ characteristics: { base: { i: 41 }, advances: { i: 4 }, move: 4 } });

    expect(p.abilities.baseInitiative).toBe(45);
    expect(p.abilities.initiative).toBe(45);
    expect(p.combatStats.speed).toBe(24);
  });

  it("empty characteristics fall back to defaults", async () => {
    const p = await build({ characteristics: {} });

    expect(p.abilities.characteristics).toEqual(DEFAULT_CHARACTERISTICS);
    expect(p.abilities.wfrp).toMatchObject({ sb: 3, tb: 3 });
  });

  it("d20 system: fields absent, JSON identical to the shape without them (snapshotHash unchanged)", async () => {
    const p = await build({ characteristics: { base: { s: 45 } } }, parseRules({}));

    expect(p.abilities).not.toHaveProperty("wfrp");
    expect(p.abilities).not.toHaveProperty("characteristics");
    expect(JSON.stringify(p.abilities)).not.toMatch(/characteristics|wfrp/);
  });

  it("refreshFromSource copies characteristics and wfrp, leaves d20 untouched", async () => {
    const live = await build({});

    const fresh = await build({ characteristics: { base: { s: 60 } } });

    const out = refreshFromSource(live, fresh);

    expect(out.abilities.wfrp?.sb).toBe(6);

    const d20 = await build({}, parseRules({}));

    expect(refreshFromSource(d20, d20).abilities).not.toHaveProperty("wfrp");
  });
});
