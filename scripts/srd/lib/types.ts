import type { AbilityKey } from "@/lib/constants/abilities";
import type { ClassCaster } from "@/lib/constants/classes";
import type { DndSkill } from "@/lib/constants/skills";
import type { SpellGroupIconKey } from "@/lib/constants/spell-groups";
import type { WeaponTrait } from "@/lib/constants/weapon-traits";
import type { Ability, Effect } from "@/lib/utils/abilities/schema";
import type { ArmorStats } from "@/lib/utils/artifacts/armor-stats";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";
import type { ItemStats } from "@/lib/utils/items/item-stats";
import type { SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { Choice, FeatPrerequisite, FeatType } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

export const SRD_KINDS = ["spell-groups", "spells", "races", "classes", "feats", "units", "artifacts"] as const;

export type SrdKind = (typeof SRD_KINDS)[number];

export interface SpellGroupRow { slug: string; name: string; color: string; icon: SpellGroupIconKey }

export interface SpellRow {
  slug: string;
  name: string;
  level: number;
  groupId: string;
  description: string;
  cost: "action" | "bonusAction";
  dice: number;
  dieSides?: 4 | 6 | 8 | 10 | 12;
  concentration: boolean;
  upcastDice?: number;
  upcastTargets?: number;
  addAbilityMod?: boolean;
  targeting: SpellTargeting;
  resolution: SpellResolution;
  spellEffects: Effect[];
  lists: string[];
}

export interface RaceRow { slug: string; name: string; passiveAbility: { name: string; description: string }; abilities: Ability[]; choices?: Choice[] }

export interface ClassFeatureGroup { level: number; abilities: Ability[]; choices?: Choice[] }

export interface ClassRow {
  slug: string;
  name: string;
  hitDie: 6 | 8 | 10 | 12;
  savingThrows: AbilityKey[];
  proficiencies: { armor: string[]; weapons: string[]; tools: string[] };
  skillChoices: { count: number; from: DndSkill[] };
  caster: ClassCaster;
  spellcastingAbility: AbilityKey | null;
  features: ClassFeatureGroup[];
  subclassLevel: number;
  subclasses: Array<{ id: string; name: string; features: ClassFeatureGroup[] }>;
  columns: ClassColumn[];
  spellList?: string;
}

export interface UnitAttackRow {
  name: string;
  type: "melee" | "ranged";
  attackBonus: number;
  damageType: string;
  damageDice: string;
  range?: string;
  properties?: string;
  traits?: WeaponTrait[];
}

export interface UnitRow {
  slug: string;
  name: string;
  level: number;
  cr: number;
  armorClass: number;
  maxHp: number;
  speed: number;
  initiative: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  gridSize: 1 | 2 | 3;
  multiattack: number;
  legendaryActions: number;
  legendaryResistances: number;
  saveProficiencies: AbilityKey[];
  attacks: UnitAttackRow[];
  abilities: Ability[];
}

export interface ArtifactRow {
  slug: string;
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  slot: "weapon" | "range_weapon" | "shield" | "armor" | "ring" | "amulet" | "boots" | "cloak" | "helmet" | "item";
  weapon?: WeaponStats;
  armor?: ArmorStats;
  item?: ItemStats;
  abilities?: Ability[];
}

export interface FeatRow {
  slug: string;
  name: string;
  type: FeatType;
  prerequisite: FeatPrerequisite;
  repeatable: boolean;
  description: string;
  abilities: Ability[];
  choices: Choice[];
}

export interface SrdData {
  "spell-groups": SpellGroupRow[];
  spells: SpellRow[];
  races: RaceRow[];
  classes: ClassRow[];
  feats: FeatRow[];
  units: UnitRow[];
  artifacts: ArtifactRow[];
}
