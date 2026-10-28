import { describe, expect, it } from "vitest";

import { applyClassChoices, boldOptions, headingSections } from "../convert/class-choices";
import { convertClasses } from "../convert/classes";
import { convertSpells } from "../convert/spells";
import { FIXTURE_4F4_DIR, loadOpen5e } from "../lib/open5e";

import { ClassChoicesSchema } from "@/lib/schemas/choices";

const data = loadOpen5e(FIXTURE_4F4_DIR);

const classes = applyClassChoices(convertClasses(data));

const cls = (name: string) => classes.find((c) => c.name === name)!;

const groups = (name: string) => [...cls(name).features, ...cls(name).subclasses.flatMap((s) => s.features)];

const choices = (name: string) => groups(name).flatMap((g) => g.choices ?? []);

const choice = (name: string, id: string) => choices(name).find((c) => c.id === id);

const abilityIds = (name: string) => groups(name).flatMap((g) => g.abilities.map((a) => a.id));

describe("parsers", () => {
  it("### sections and bold paragraphs", () => {
    expect(headingSections("Intro\n\n### Agonizing Blast\n\n*Prerequisite: Level 2+ Warlock*\n\nText.\n\n### **Lessons of the First Ones**\n\nMore.")).toEqual([
      { title: "Agonizing Blast", body: "*Prerequisite: Level 2+ Warlock*\n\nText." },
      { title: "Lessons of the First Ones", body: "More." },
    ]);
    expect(boldOptions("Pick one.\n\n**Protector.** Martial weapons.\n\n**Thaumaturge.** One cantrip.")).toEqual([{ name: "Protector", text: "Martial weapons." }, { name: "Thaumaturge", text: "One cantrip." }]);
  });
});

describe("class choices", () => {
  it("Fighter: ASI at 4/6/8/12/14/16 and Epic Boon as feat choices; Fighting Style; notes replaced", () => {
    expect(choices("Fighter").filter((c) => c.id.startsWith("ability-score-improvement")).map((c) => c.level)).toEqual([4, 6, 8, 12, 14, 16]);
    expect(choice("Fighter", "ability-score-improvement-4")).toMatchObject({ kind: "feat", count: 1, featTypes: ["origin", "general"] });
    expect(choice("Fighter", "epic-boon-19")?.featTypes).toEqual(["origin", "general", "epicBoon"]);
    expect(choice("Fighter", "fighting-style-1")).toMatchObject({ kind: "feat", featTypes: ["fightingStyle"] });
    expect(choice("Fighter", "additional-fighting-style-7")?.featTypes).toEqual(["fightingStyle"]);
    expect(abilityIds("Fighter").some((id) => id.startsWith("ability-score-improvement") || id.startsWith("fighting-style") || id.startsWith("epic-boon"))).toBe(false);
    expect(abilityIds("Fighter")).toContain("weapon-mastery-1");
  });

  it("Paladin and Ranger Fighting Style embed Blessed / Druidic Warrior", () => {
    expect(choice("Paladin", "fighting-style-2")?.options?.map((o) => o.id)).toEqual(["blessed-warrior"]);
    expect(choice("Ranger", "fighting-style-2")?.options?.map((o) => o.id)).toEqual(["druidic-warrior"]);
  });

  it("Sorcerer: Metamagic with 9 options and the metamagic column; spell list and spell choices", () => {
    expect(choice("Sorcerer", "metamagic")).toMatchObject({ level: 2, kind: "option", count: { scale: "metamagic" } });
    expect(choice("Sorcerer", "metamagic")?.options).toHaveLength(9);
    expect(cls("Sorcerer").columns.find((c) => c.key === "metamagic")?.values).toEqual(["", ...Array(8).fill("2"), ...Array(7).fill("4"), ...Array(4).fill("6")]);
    expect(abilityIds("Sorcerer").filter((id) => id.startsWith("metamagic"))).toEqual([]);
    expect(cls("Sorcerer").spellList).toBe("Sorcerer");
    expect(choice("Sorcerer", "cantrips")).toMatchObject({ level: 1, count: { scale: "cantrips" }, kind: "spell", spells: { lists: ["Sorcerer"], minLevel: 0, maxLevel: 0 } });
    expect(choice("Sorcerer", "prepared-spells")).toMatchObject({ count: { scale: "prepared-spells" }, spells: { minLevel: 1, maxLevel: "slots" } });
  });

  it("Warlock: 28 invocations with prerequisites; Eldritch Mind and Thirsting Blade mechanized", () => {
    const inv = choice("Warlock", "eldritch-invocations");

    expect(inv).toMatchObject({ level: 1, count: { scale: "eldritch-invocation-count" } });
    expect(inv?.options).toHaveLength(28);
    expect(inv?.options?.find((o) => o.id === "thirsting-blade")).toMatchObject({ minLevel: 5, requires: ["pact-of-the-blade"], abilities: [{ effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }] }] });
    expect(inv?.options?.find((o) => o.id === "devouring-blade")?.requires).toEqual(["thirsting-blade"]);
    expect(inv?.options?.find((o) => o.id === "eldritch-mind")?.abilities[0].effects).toEqual([{ kind: "flag", flag: "saveAdvantage", abilities: ["constitution"] }]);
    expect(inv?.options?.find((o) => o.id === "lessons-of-the-first-ones")).toBeDefined();
    expect(abilityIds("Warlock").filter((id) => id.startsWith("eldritch-invocation"))).toEqual([]);
  });

  it("expertise and skills", () => {
    expect(choice("Bard", "expertise-2")).toMatchObject({ kind: "expertise", count: 2, level: 2 });
    expect(choice("Bard", "expertise-9")).toMatchObject({ kind: "expertise", count: 2, level: 9 });
    expect(choice("Rogue", "expertise-6")?.count).toBe(2);
    expect(choice("Ranger", "deft-explorer-2")).toMatchObject({ kind: "expertise", count: 1 });
    expect(abilityIds("Ranger")).toContain("deft-explorer-2");
    expect(choice("Wizard", "scholar-2")?.skills).toEqual(["arcana", "history", "investigation", "medicine", "nature", "religion"]);
    expect(choice("Barbarian", "primal-knowledge-3")).toMatchObject({ kind: "skill", count: 1, skills: cls("Barbarian").skillChoices.from });
    expect(choice("Bard", "bonus-proficiencies-3")).toMatchObject({ kind: "skill", count: 3 });
    expect(choice("Bard", "magical-discoveries-6")).toMatchObject({ kind: "spell", count: 2, spells: { lists: ["Cleric", "Druid", "Wizard"], minLevel: 0, maxLevel: "slots" } });
  });

  it("binary options and resistances", () => {
    expect(choice("Cleric", "divine-order-1")?.options?.map((o) => o.id)).toEqual(["protector", "thaumaturge"]);
    expect(choice("Cleric", "blessed-strikes-7")?.options?.find((o) => o.id === "divine-strike")?.abilities[0]).toMatchObject({ trigger: { event: "hit", role: "attacker" }, limits: { perTurn: 1 }, effects: [{ kind: "dealDamage", amount: "1d8", damageType: "radiant" }] });
    expect(choice("Ranger", "hunters-prey-3")?.options?.find((o) => o.id === "colossus-slayer")?.abilities[0].condition).toEqual({ type: "hpBelow", who: "eventTarget", percent: 100 });
    expect(choice("Sorcerer", "elemental-affinity-6")?.options?.map((o) => o.id)).toEqual(["acid", "cold", "fire", "lightning", "poison"]);
    expect(choice("Warlock", "fiendish-resilience-10")?.options).toHaveLength(12);
    expect(choice("Warlock", "fiendish-resilience-10")?.options?.some((o) => o.id === "force")).toBe(false);
  });

  it("every class: choice ids unique with each subclass, scale columns exist, schema passes", () => {
    for (const c of classes) {
      const own = c.features.flatMap((g) => g.choices ?? []);

      for (const s of [null, ...c.subclasses]) {
        const all = [...own, ...(s?.features.flatMap((g) => g.choices ?? []) ?? [])];

        expect(new Set(all.map((x) => x.id)).size, `${c.name} ${s?.id ?? ""}`).toBe(all.length);
      }

      for (const ch of [...own, ...c.subclasses.flatMap((s) => s.features.flatMap((g) => g.choices ?? []))]) {
        if (typeof ch.count !== "number") expect(c.columns.some((col) => col.key === (ch.count as { scale: string }).scale), `${c.name}: ${ch.id}`).toBe(true);
      }

      for (const g of [...c.features, ...c.subclasses.flatMap((s) => s.features)]) if (g.choices) expect(ClassChoicesSchema.safeParse(g.choices).success, `${c.name} ${g.level}`).toBe(true);
    }
  });
});

describe("spell lists", () => {
  it("Spell.classes → lists by class name", () => {
    const spells = convertSpells(data);

    expect(spells.find((s) => s.name === "Fire Bolt")?.lists).toEqual(["Sorcerer", "Wizard"]);
    expect(spells.find((s) => s.name === "Cure Wounds")?.lists).toEqual(expect.arrayContaining(["Cleric", "Druid"]));
  });
});
