import { type Fixture, type O5Armor, type O5Weapon, type Open5eData } from "../lib/open5e";
import { bySlug } from "../lib/text";
import type { ArtifactRow } from "../lib/types";

import { WEAPON_TRAITS, type WeaponTrait } from "@/lib/constants/weapon-traits";
import type { ArmorCategory } from "@/lib/utils/artifacts/armor-stats";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";
import { groupBy } from "@/lib/utils/common/collections";
import { capitalize } from "@/lib/utils/common/text";

const TRAIT_OF: Record<string, WeaponTrait> = {
  "srd-2024_finesse-wp": "finesse",
  "srd-2024_light-wp": "light",
  "srd-2024_reach-wp": "reach",
  "srd-2024_thrown-wp": "thrown",
  "srd-2024_two-handed-wp": "twoHanded",
  "srd-2024_versatile-wp": "versatile",
  "srd-2024_ammunition-wp": "ammunition",
};

const NOTE_OF: Record<string, string> = { "srd-2024_heavy-wp": "Heavy", "srd-2024_loading-wp": "Loading" };

// SRD 5.2 lists Dart as a Simple Ranged weapon without the Ammunition property
const RANGED_WEAPONS = new Set(["srd-2024_dart"]);

const SHIELD_PK = "srd-2024_shield";

const amount = (s: string | undefined) => (s === undefined ? "—" : String(Number(s)));

function convertWeapon(w: Fixture<O5Weapon>, data: Open5eData, assignments: Map<string, Open5eData["weaponAssignments"]>): ArtifactRow {
  const props = assignments.get(w.pk) ?? [];

  const propName = (pk: string) => data.weaponProperties.find((p) => p.pk === pk)?.fields.name ?? pk;

  const traits = WEAPON_TRAITS.filter((t) => props.some((p) => TRAIT_OF[p.fields.property] === t));

  const mastery = props.find((p) => p.fields.property.endsWith("-mastery"));

  const ranged = traits.includes("ammunition") || RANGED_WEAPONS.has(w.pk);

  const versatile = props.find((p) => p.fields.property === "srd-2024_versatile-wp")?.fields.detail ?? undefined;

  const notes = [...props.flatMap((p) => (NOTE_OF[p.fields.property] ? [NOTE_OF[p.fields.property]] : [])), mastery && `Mastery: ${propName(mastery.fields.property)}`].filter(Boolean);

  const weapon: WeaponStats = {
    damageDice: w.fields.damage_dice,
    damageType: w.fields.damage_type,
    attackType: ranged ? "ranged" : "melee",
    ...(w.fields.range > 0 && { range: `${w.fields.range}/${w.fields.long_range}` }),
    ...(traits.length > 0 && { traits }),
    ...(versatile && { versatileDice: versatile }),
    ...(notes.length > 0 && { properties: notes.join(". ").slice(0, 200) }),
  };

  const item = data.items.find((i) => i.fields.weapon === w.pk || i.pk === w.pk)?.fields;

  const propertyList = props.filter((p) => !p.fields.property.endsWith("-mastery")).map((p) => `${propName(p.fields.property)}${p.fields.detail ? ` (${p.fields.detail})` : ""}`);

  const description = [
    `${w.fields.is_simple ? "Simple" : "Martial"} ${ranged ? "Ranged" : "Melee"} Weapon.`,
    `Damage: ${w.fields.damage_dice} ${w.fields.damage_type}.`,
    `Properties: ${propertyList.join(", ") || "—"}.`,
    `Mastery: ${mastery ? propName(mastery.fields.property) : "—"}.`,
    `Cost: ${amount(item?.cost)} GP. Weight: ${amount(item?.weight)} lb.`,
  ].join(" ");

  return { slug: w.pk, name: w.fields.name, description, rarity: "common", slot: ranged ? "range_weapon" : "weapon", weapon, item: { unique: false } };
}

// Open5e has no category: no Dex → heavy, Dex capped at 2 → medium, otherwise light
export function armorCategory(a: O5Armor): ArmorCategory {
  if (!a.ac_add_dexmod) return "heavy";

  return a.ac_cap_dexmod === 2 ? "medium" : "light";
}

const AC_TEXT: Record<ArmorCategory, (base: number) => string> = {
  light: (b) => `${b} + Dex modifier`,
  medium: (b) => `${b} + Dex modifier (max 2)`,
  heavy: (b) => String(b),
};

function convertArmor(data: Open5eData): ArtifactRow[] {
  return data.armor
    .filter((a) => a.pk !== SHIELD_PK)
    .map((a) => {
      const f = a.fields;

      const category = armorCategory(f);

      const item = data.items.find((i) => i.pk === a.pk || i.fields.armor === a.pk)?.fields;

      const description = [
        `${capitalize(category)} Armor.`,
        `Armor Class: ${AC_TEXT[category](f.ac_base)}.`,
        f.strength_score_required ? `Strength: ${f.strength_score_required}.` : null,
        f.grants_stealth_disadvantage ? "Stealth: Disadvantage." : null,
        `Cost: ${amount(item?.cost)} GP. Weight: ${amount(item?.weight)} lb.`,
      ]
        .filter(Boolean)
        .join(" ");

      return {
        slug: a.pk,
        name: f.name,
        description,
        rarity: "common" as const,
        slot: "armor" as const,
        item: { unique: false },
        armor: { category, base: f.ac_base, ...(f.strength_score_required && { strength: f.strength_score_required }), ...(f.grants_stealth_disadvantage && { stealthDisadvantage: true }) },
      };
    });
}

function convertShield(data: Open5eData): ArtifactRow[] {
  const shield = data.armor.find((a) => a.pk === SHIELD_PK);

  if (!shield) return [];

  const item = data.items.find((i) => i.pk === SHIELD_PK)?.fields;

  return [
    {
      slug: shield.pk,
      name: shield.fields.name,
      description: `Shield. Armor Class: +${shield.fields.ac_base}. Cost: ${amount(item?.cost)} GP. Weight: ${amount(item?.weight)} lb.`,
      rarity: "common",
      slot: "shield",
      item: { unique: false },
      abilities: [{ id: "shield-ac", name: "Shield", description: `+${shield.fields.ac_base} Armor Class while you hold the Shield.`, trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: shield.fields.ac_base }] }],
    },
  ];
}

export function convertArtifacts(data: Open5eData): ArtifactRow[] {
  const assignments = groupBy(data.weaponAssignments, (a) => a.fields.weapon);

  return [...data.weapons.map((w) => convertWeapon(w, data, assignments)), ...convertArmor(data), ...convertShield(data)].sort(bySlug);
}
