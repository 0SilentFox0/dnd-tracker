import type { AbilityKey } from "@/lib/constants/abilities";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import type { Ability } from "@/types/abilities";
import type { ChoiceRace, FeatData, SpellRef } from "@/types/choices";
import type { GameClassData } from "@/types/classes";

export const note = (id: string): Ability => ({ id, name: id, trigger: { event: "passive" }, effects: [{ kind: "note", text: id }] });

const column = (key: string, at: (level: number) => string) => ({ key, label: key, values: Array.from({ length: 20 }, (_, i) => at(i + 1)) });

export const elf: ChoiceRace = {
  id: "race-elf",
  name: "Elf",
  choices: [
    {
      id: "elven-lineage",
      label: "Elven Lineage",
      level: 1,
      count: 1,
      lineage: true,
      kind: "option",
      options: [
        { id: "drow", name: "Drow", abilities: [note("superior-darkvision")], spells: [{ level: 1, spellId: "sp-dancing" }, { level: 3, spellId: "sp-faerie" }] },
        { id: "wood-elf", name: "Wood Elf", abilities: [{ id: "speed", name: "Speed", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "speed", flat: 5 }] }], spells: [{ level: 1, spellId: "sp-druidcraft" }, { level: 3, spellId: "sp-longstrider" }] },
      ],
    },
    { id: "keen-senses", label: "Keen Senses", level: 1, count: 1, kind: "skill", skills: ["insight", "perception", "survival"] },
  ],
};

const base = { icon: null, color: null, savingThrows: [], proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] }, subclassLevel: 3, subclasses: [] };

export const sorcerer: GameClassData = {
  ...base,
  id: "cls-sorc",
  name: "Sorcerer",
  hitDie: 6,
  caster: "full",
  spellcastingAbility: "charisma",
  spellList: "Sorcerer",
  columns: [column("cantrips", (l) => (l < 4 ? "4" : l < 10 ? "5" : "6")), column("metamagic", (l) => (l < 2 ? "" : l < 10 ? "2" : l < 17 ? "4" : "6"))],
  features: [
    {
      level: 1,
      abilities: [],
      choices: [
        { id: "cantrips", label: "Cantrips", level: 1, count: { scale: "cantrips" }, kind: "spell", spells: { lists: ["Sorcerer"], minLevel: 0, maxLevel: 0 } },
        { id: "prepared-spells", label: "Prepared Spells", level: 1, count: 2, kind: "spell", spells: { lists: ["Sorcerer"], minLevel: 1, maxLevel: "slots" } },
      ],
    },
    {
      level: 2,
      abilities: [],
      choices: [
        {
          id: "metamagic",
          label: "Metamagic",
          level: 2,
          count: { scale: "metamagic" },
          kind: "option",
          options: [
            { id: "quickened", name: "Quickened Spell", abilities: [note("quickened")] },
            { id: "twinned", name: "Twinned Spell", abilities: [] },
            { id: "careful", name: "Careful Spell", minLevel: 3, abilities: [] },
            { id: "empowered", name: "Empowered Spell", requires: ["careful"], abilities: [] },
          ],
        },
      ],
    },
    { level: 4, abilities: [], choices: [{ id: "ability-score-improvement-4", label: "Ability Score Improvement", level: 4, count: 1, kind: "feat", featTypes: ["origin", "general"] }] },
  ],
};

export const rogue: GameClassData = {
  ...base,
  id: "cls-rogue",
  name: "Rogue",
  hitDie: 8,
  caster: "none",
  spellcastingAbility: null,
  columns: [],
  features: [{ level: 1, abilities: [], choices: [{ id: "expertise-1", label: "Expertise", level: 1, count: 2, kind: "expertise" }] }],
};

export const asi: FeatData = { id: "f-asi", name: "Ability Score Improvement", icon: null, type: "general", prerequisite: { level: 4 }, repeatable: true, description: null, abilities: [], choices: [{ id: "asi", label: "Ability Score Increase", level: 1, count: 1, kind: "abilityScore", points: 2, max: 20 }] };

export const grappler: FeatData = {
  id: "f-grappler",
  name: "Grappler",
  icon: null,
  type: "general",
  prerequisite: { level: 4, scores: { abilities: ["strength", "dexterity"], min: 13 } },
  repeatable: false,
  description: null,
  abilities: [note("punch-and-grab")],
  choices: [{ id: "grappler-asi", label: "Ability Score Increase", level: 1, count: 1, kind: "abilityScore", abilities: ["strength", "dexterity"], points: 1, max: 20 }],
};

export const alert: FeatData = { id: "f-alert", name: "Alert", icon: null, type: "origin", prerequisite: {}, repeatable: false, description: null, abilities: [{ id: "alert", name: "Alert", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: { formula: "prof" } }] }], choices: [] };

export const magicInitiate: FeatData = {
  id: "f-mi",
  name: "Magic Initiate",
  icon: null,
  type: "origin",
  prerequisite: {},
  repeatable: true,
  description: null,
  abilities: [],
  choices: [{ id: "cantrips", label: "Cantrips", level: 1, count: 2, kind: "spell", spells: { lists: ["Cleric", "Druid", "Wizard"], minLevel: 0, maxLevel: 0 } }],
};

export const archery: FeatData = { id: "f-archery", name: "Archery", icon: null, type: "fightingStyle", prerequisite: {}, repeatable: false, description: null, abilities: [{ id: "archery", name: "Archery", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 2, attackKind: "ranged" }] }], choices: [] };

export const featsById = Object.fromEntries([asi, grappler, alert, magicInitiate, archery].map((f) => [f.id, f]));

export const spells: SpellRef[] = [
  { id: "sp-firebolt", name: "Fire Bolt", level: 0, lists: ["Sorcerer", "Wizard"] },
  { id: "sp-guidance", name: "Guidance", level: 0, lists: ["Cleric", "Druid"] },
  { id: "sp-missile", name: "Magic Missile", level: 1, lists: ["Sorcerer", "Wizard"] },
  { id: "sp-cure", name: "Cure Wounds", level: 1, lists: ["Cleric", "Druid"] },
  { id: "sp-fireball", name: "Fireball", level: 3, lists: ["Sorcerer", "Wizard"] },
];

export const spellsById = Object.fromEntries(spells.map((s) => [s.id, s]));

export const refs: ChoiceRefs = { race: elf, classesById: { [sorcerer.id]: sorcerer, [rogue.id]: rogue }, featsById, spellsById };

export const scores: Record<AbilityKey, number> = { strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 17 };

export const empty = { raceChoices: {}, feats: [], classes: [] };
