import type { CharacterSheet } from "@/types/characters";

const line = (label: string, value: string) => ({ label, value });

export const sheetFixture: CharacterSheet = {
  viewer: { isDM: false, isOwner: true },
  maxLevel: 30,
  identity: { id: "lira", name: "Ліра", avatar: null, level: 30, className: "Слідопит", subclass: null, race: "Ельф", raceIcon: null, alignment: null },
  abilities: [
    { key: "strength", score: 10, mod: 0, isPrimary: false, lines: [line("База", "10")] },
    { key: "dexterity", score: 18, mod: 4, isPrimary: true, lines: [line("База", "18")] },
    { key: "constitution", score: 10, mod: 0, isPrimary: false, lines: [line("База", "10")] },
    { key: "intelligence", score: 10, mod: 0, isPrimary: false, lines: [line("База", "10")] },
    { key: "wisdom", score: 10, mod: 0, isPrimary: false, lines: [line("База", "10")] },
    { key: "charisma", score: 10, mod: 0, isPrimary: false, lines: [line("База", "10")] },
  ],
  primaryAbility: "dexterity",
  proficiency: 9,
  hp: { total: 300, lines: [line("= 30 × 10 × 1 = 300", "")] },
  armorClass: { total: 17, lines: [line("База", "14"), line("Залізна шкіра", "+2"), line("Аура дракона", "+1")] },
  initiative: 4,
  speed: 30,
  morale: 1,
  targets: { min: 1, max: 3 },
  immunities: [],
  languages: ["Ельфійська"],
  proficiencies: [],
  attacks: [
    { id: "bow", name: "Довгий лук", kind: "ranged", toHit: { total: 13, lines: [line("Спритність ★", "+4"), line("Майстерність", "+9")] }, avgDamage: { total: 68, lines: [line("Зброя 1d6", "3.5"), line("Рівень + 6d8+1d6", "60.5")] } },
    { id: "dagger", name: "Кинджал", kind: "melee", toHit: { total: 13, lines: [line("Спритність ★", "+4"), line("Майстерність", "+9")] }, avgDamage: { total: 66, lines: [line("Зброя 1d4", "2.5")] } },
  ],
  bestToHit: 13,
  saves: [{ key: "dexterity", label: "Спритність", ability: "dexterity", bonus: 13, proficient: true }],
  skills: [{ key: "stealth", label: "Скритність", ability: "dexterity", bonus: 13, proficient: true }],
  passives: { perception: 19, investigation: 10, insight: 10 },
  magic: null,
  slots: [{ level: 1, count: 4 }, { level: 2, count: 2 }],
  spells: [{ id: "mark", name: "Мітка мисливця", level: 1, type: "target", damageType: "damage", diceCount: 1, diceType: "d6", concentration: true }],
  items: {
    grid: { armor: { id: "a1", name: "Кольчуга ельфів", icon: null, slot: "armor", rarity: "rare", description: "Легка і тиха.", effects: ["AC +2"] } },
    artifacts: [{ id: "a1", name: "Кольчуга ельфів", icon: null, slot: "armor", rarity: "rare", description: "Легка і тиха.", effects: ["AC +2"] }],
    sets: [{ setId: "s1", name: "Мисливець", have: 2, total: 3, complete: false, effects: ["Ініціатива +1"] }],
  },
  personalSkill: null,
  progression: { freePoints: 0, level: 5, seenLevel: null },
  story: {
    biography: "Мати ==загинула== давно",
    goals: [
      { id: "d1", text: "Знайти брата", status: "active", author: "dm" },
      { id: "p1", text: "Повернути лук", status: "active", author: "player" },
    ],
  },
};

export const withSheet = (over: Partial<CharacterSheet>): CharacterSheet => ({ ...sheetFixture, ...over });
