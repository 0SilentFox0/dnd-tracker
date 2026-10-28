import type { AbilityCore } from "../lib/abilities";

import type { DndSkill } from "@/lib/constants/skills";
import type { Choice, FeatType } from "@/types/choices";

/** ключ — хвіст id вміння без «-<рівень>» */
export const FEAT_FEATURES: Record<string, { featTypes: FeatType[]; embedded?: true }> = {
  "ability-score-improvement": { featTypes: ["origin", "general"] },
  "epic-boon": { featTypes: ["origin", "general", "epicBoon"] },
  "fighting-style": { featTypes: ["fightingStyle"], embedded: true },
  "additional-fighting-style": { featTypes: ["fightingStyle"] },
};

/** ключ — "<клас>:<хвіст>" */
export const EXPERTISE_FEATURES: Record<string, { count: number; skills?: DndSkill[]; keepAbility?: true }> = {
  "bard:expertise": { count: 2 },
  "rogue:expertise": { count: 2 },
  "ranger:deft-explorer": { count: 1, keepAbility: true },
  "ranger:expertise": { count: 2 },
  "wizard:scholar": { count: 1, skills: ["arcana", "history", "investigation", "medicine", "nature", "religion"] },
};

export const SKILL_FEATURES: Record<string, { count: number; fromClass?: true; keepAbility?: true }> = {
  "barbarian:primal-knowledge": { count: 1, fromClass: true, keepAbility: true },
  "bard:bonus-proficiencies": { count: 3 },
};

export const SPELL_FEATURES: Record<string, NonNullable<Choice["spells"]> & { count: number }> = {
  "bard:magical-discoveries": { count: 2, lists: ["Cleric", "Druid", "Wizard"], minLevel: 0, maxLevel: "slots" },
};

const strike = (damageType: string): AbilityCore => ({ trigger: { event: "hit", role: "attacker" }, limits: { perTurn: 1 }, effects: [{ kind: "dealDamage", amount: "1d8", damageType, target: "eventTarget" }] });

/** бінарні вибори з жирних абзаців; механіка — за id опції */
export const BINARY_FEATURES: Record<string, Record<string, AbilityCore>> = {
  "divine-order": {},
  "primal-order": {},
  "blessed-strikes": { "divine-strike": strike("radiant") },
  "elemental-fury": { "primal-strike": strike("fire") },
  "hunters-prey": { "colossus-slayer": { trigger: { event: "hit", role: "attacker" }, condition: { type: "hpBelow", who: "eventTarget", percent: 100 }, limits: { perTurn: 1 }, effects: [{ kind: "dealDamage", amount: "1d8", target: "eventTarget" }] } },
  "defensive-tactics": {},
};

export const RESISTANCE_FEATURES: Record<string, string[]> = {
  "elemental-affinity": ["acid", "cold", "fire", "lightning", "poison"],
  "fiendish-resilience": ["acid", "bludgeoning", "cold", "fire", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"],
};

/** вибори без вміння-носія в даних (рівень повторення фічі) */
export const EXTRA_CHOICES: Record<string, Choice[]> = {
  "srd-2024_warlock": [6, 7, 8, 9].map((level, i) => ({ id: `mystic-arcanum-${level}`, label: `Mystic Arcanum (${level})`, level: 11 + i * 2, count: 1, kind: "spell", spells: { lists: ["Warlock"], minLevel: level, maxLevel: level }, grant: { uses: 1, rest: "long", castLevel: level, via: "grant" } })),
  "srd-2024_wizard": [{ id: "signature-spells", label: "Signature Spells", level: 20, count: 2, kind: "spell", spells: { lists: ["Wizard"], minLevel: 3, maxLevel: 3 }, grant: { uses: 1, rest: "short", castLevel: 3, via: "slotOrGrant" } }],
  "srd-2024_bard": [{ id: "expertise-9", label: "Expertise", level: 9, count: 2, kind: "expertise" }],
};

export const INVOCATION_MECHANICS: Record<string, AbilityCore> = {
  "eldritch-mind": { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "saveAdvantage", abilities: ["constitution"] }] },
  "thirsting-blade": { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }] },
};
