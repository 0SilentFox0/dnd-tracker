export const HERO_ARCHETYPE_KEYS = ["warrior", "paladin", "ranger", "rogue", "mage"] as const;

export type HeroArchetypeKey = (typeof HERO_ARCHETYPE_KEYS)[number];

export interface HeroArchetype {
  key: HeroArchetypeKey | null;
  name: string;
  hpPerLevel: number;
  melee: number;
  ranged: number;
  magic: number;
}

const UNIVERSAL: HeroArchetype = { key: null, name: "Універсал", hpPerLevel: 10, melee: 1, ranged: 1, magic: 1 };

const ARCHETYPES: Record<HeroArchetypeKey, HeroArchetype> = {
  warrior: { key: "warrior", name: "Воїн", hpPerLevel: 12, melee: 1.2, ranged: 0.8, magic: 0.6 },
  paladin: { key: "paladin", name: "Паладин", hpPerLevel: 14, melee: 1.1, ranged: 0.5, magic: 0.9 },
  ranger: { key: "ranger", name: "Лучник", hpPerLevel: 9, melee: 0.7, ranged: 1.25, magic: 0.7 },
  rogue: { key: "rogue", name: "Розбійник", hpPerLevel: 9, melee: 1.1, ranged: 1, magic: 0.6 },
  mage: { key: "mage", name: "Маг", hpPerLevel: 8, melee: 0.5, ranged: 0.6, magic: 1.25 },
};

export function heroArchetype(key: string | null | undefined): HeroArchetype {
  return (HERO_ARCHETYPE_KEYS as readonly string[]).includes(key ?? "") ? ARCHETYPES[key as HeroArchetypeKey] : UNIVERSAL;
}

export const HERO_ARCHETYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: UNIVERSAL.name },
  ...HERO_ARCHETYPE_KEYS.map((k) => ({ value: k, label: ARCHETYPES[k].name })),
];
