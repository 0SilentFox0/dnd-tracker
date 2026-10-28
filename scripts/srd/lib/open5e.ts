import * as fs from "fs";
import * as path from "path";

import type { Open5eFile } from "./source";

export interface Fixture<F, K = string> {
  model: string;
  pk: K;
  fields: F;
}

export interface O5Spell {
  name: string;
  desc: string;
  level: number;
  school: string;
  higher_level: string | null;
  range_text: string;
  range: number | null;
  ritual: boolean;
  casting_time: string;
  reaction_condition?: string | null;
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  material_specified: string | null;
  target_count: number | null;
  saving_throw_ability: string | null;
  attack_roll: boolean;
  damage_roll: string | null;
  damage_types: string[];
  duration: string;
  shape_type: string | null;
  shape_size: number | null;
  concentration: boolean;
  classes: string[];
}

export interface O5CastingOption { parent: string; type: string; damage_roll: string | null }

export interface O5Class { name: string; hit_dice: string | null; caster_type: string; saving_throws: string[]; subclass_of: string | null; desc?: string }

export interface O5Feature { name: string; desc: string; parent: string; feature_type?: string }

export interface O5FeatureItem { parent: string; level: number; column_value: string | null }

export interface O5Species { name: string }

export interface O5SpeciesTrait { name: string; desc: string; parent: string; type: string | null; order: number }

export interface O5Creature {
  name: string;
  size: string;
  type: string;
  alignment: string;
  armor_class: number;
  hit_points: number;
  initiative_bonus: number;
  walk: number | null;
  fly: number | null;
  swim: number | null;
  climb: number | null;
  burrow: number | null;
  challenge_rating: string;
  ability_score_strength: number;
  ability_score_dexterity: number;
  ability_score_constitution: number;
  ability_score_intelligence: number;
  ability_score_wisdom: number;
  ability_score_charisma: number;
  saving_throw_strength: number | null;
  saving_throw_dexterity: number | null;
  saving_throw_constitution: number | null;
  saving_throw_intelligence: number | null;
  saving_throw_wisdom: number | null;
  saving_throw_charisma: number | null;
  damage_immunities: string[];
  damage_resistances: string[];
  damage_vulnerabilities: string[];
  condition_immunities: string[];
  blindsight_range: number | null;
  darkvision_range: number | null;
  tremorsense_range: number | null;
  truesight_range: number | null;
  passive_perception: number | null;
  languages_desc: string | null;
  hover?: boolean;
  telepathy_range?: number | null;
}

export interface O5CreatureAction {
  name: string;
  desc: string;
  parent: string;
  action_type: "ACTION" | "BONUS_ACTION" | "REACTION" | "LEGENDARY_ACTION";
  uses_type: string | null;
  uses_param: number | null;
  legendary_action_cost?: number | null;
  order_in_statblock?: number;
}

export interface O5CreatureAttack {
  name: string;
  parent: string;
  to_hit_mod: number;
  reach: number | null;
  range: number | null;
  long_range: number | null;
  damage_die_count: number | null;
  damage_die_type: string | null;
  damage_bonus: number | null;
  damage_type: string | null;
  extra_damage_die_count: number | null;
  extra_damage_die_type: string | null;
  extra_damage_type: string | null;
}

export interface O5CreatureTrait { name: string; desc: string; parent: string }

export interface O5Weapon { name: string; damage_dice: string; damage_type: string; range: number; long_range: number; is_simple: boolean }

export interface O5WeaponProperty { name: string; type: string | null; desc: string }

export interface O5WeaponAssignment { weapon: string; property: string; detail: string | null }

export interface O5Armor {
  name: string;
  ac_base: number;
  ac_add_dexmod: boolean;
  ac_cap_dexmod: number | null;
  strength_score_required: number | null;
  grants_stealth_disadvantage: boolean;
}

export interface O5Item { name: string; weapon: string | null; armor: string | null; cost: string; weight: string; desc: string }

export interface O5MagicItem { name: string; desc: string; category: string; rarity: string; requires_attunement: boolean; weapon: string | null; armor: string | null }

export interface O5Feat { name: string; desc: string; type: string; prerequisite: string }

export interface O5FeatBenefit { name: string; desc: string; parent: string; type: string | null }

export interface O5Background { name: string; desc: string }
export interface O5BackgroundBenefit { name: string; desc: string; parent: string; type: string }

export interface O5Document { name: string; licenses: string[] }

export interface Open5eData {
  document: Fixture<O5Document>[];
  classes: Fixture<O5Class>[];
  features: Fixture<O5Feature>[];
  featureItems: Fixture<O5FeatureItem>[];
  species: Fixture<O5Species>[];
  speciesTraits: Fixture<O5SpeciesTrait>[];
  spells: Fixture<O5Spell>[];
  castingOptions: Fixture<O5CastingOption, number>[];
  creatures: Fixture<O5Creature>[];
  creatureActions: Fixture<O5CreatureAction>[];
  creatureAttacks: Fixture<O5CreatureAttack>[];
  creatureTraits: Fixture<O5CreatureTrait>[];
  weapons: Fixture<O5Weapon>[];
  weaponProperties: Fixture<O5WeaponProperty>[];
  weaponAssignments: Fixture<O5WeaponAssignment>[];
  armor: Fixture<O5Armor>[];
  items: Fixture<O5Item>[];
  magicItems: Fixture<O5MagicItem>[];
  feats: Fixture<O5Feat>[];
  featBenefits: Fixture<O5FeatBenefit>[];
  backgrounds: Fixture<O5Background>[];
  backgroundBenefits: Fixture<O5BackgroundBenefit>[];
}

export const OPEN5E_FILE_OF: Record<keyof Open5eData, Open5eFile> = {
  document: "Document",
  classes: "CharacterClass",
  features: "ClassFeature",
  featureItems: "ClassFeatureItem",
  species: "Species",
  speciesTraits: "SpeciesTrait",
  spells: "Spell",
  castingOptions: "SpellCastingOption",
  creatures: "Creature",
  creatureActions: "CreatureAction",
  creatureAttacks: "CreatureActionAttack",
  creatureTraits: "CreatureTrait",
  weapons: "Weapon",
  weaponProperties: "WeaponProperty",
  weaponAssignments: "WeaponPropertyAssignment",
  armor: "Armor",
  items: "Item",
  magicItems: "MagicItem",
  feats: "Feat",
  featBenefits: "FeatBenefit",
  backgrounds: "Background",
  backgroundBenefits: "BackgroundBenefit",
};

export const FIXTURE_DIR = path.join(process.cwd(), "scripts", "srd", "__tests__", "fixtures");
export const FIXTURE_4F2_DIR = path.join(process.cwd(), "scripts", "srd", "__tests__", "fixtures-4f2");

export const FIXTURE_4F3_DIR = path.join(process.cwd(), "scripts", "srd", "__tests__", "fixtures-4f3");

export const FIXTURE_4F4_DIR = path.join(process.cwd(), "scripts", "srd", "__tests__", "fixtures-4f4");

// MagicItem arrived in 4f-3, feats in 4f-4: older fixture dirs do not carry them
const OPTIONAL_FILES = new Set<Open5eFile>(["MagicItem", "Feat", "FeatBenefit", "Background", "BackgroundBenefit"]);

export function loadOpen5e(dir: string): Open5eData {
  const read = (file: Open5eFile) => {
    const full = path.join(dir, `${file}.json`);

    return OPTIONAL_FILES.has(file) && !fs.existsSync(full) ? [] : (JSON.parse(fs.readFileSync(full, "utf8")) as unknown);
  };

  return Object.fromEntries(Object.entries(OPEN5E_FILE_OF).map(([key, file]) => [key, read(file)])) as unknown as Open5eData;
}

export const slugTail = (pk: string) => pk.slice(pk.lastIndexOf("_") + 1);

export function matchesAny(row: { pk: unknown; fields: Record<string, unknown> }, ids: readonly string[]): boolean {
  const refs = [String(row.pk), row.fields.parent, row.fields.weapon].filter((v): v is string => typeof v === "string");

  return ids.some((id) => refs.some((ref) => ref === id || ref.startsWith(`${id}_`)));
}
