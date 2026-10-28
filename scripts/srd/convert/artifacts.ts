import { type Fixture, type O5Weapon, type Open5eData } from "../lib/open5e";
import { bySlug } from "../lib/text";
import type { ArtifactRow } from "../lib/types";

import { WEAPON_TRAITS, type WeaponTrait } from "@/lib/constants/weapon-traits";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";
import { groupBy } from "@/lib/utils/common/collections";

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

  return { slug: w.pk, name: w.fields.name, description, rarity: "common", slot: ranged ? "range_weapon" : "weapon", weapon };
}

function convertShield(data: Open5eData): ArtifactRow[] {
  const shield = data.armor.find((a) => a.pk === "srd-2024_shield");

  if (!shield) return [];

  const item = data.items.find((i) => i.pk === "srd-2024_shield")?.fields;

  return [
    {
      slug: shield.pk,
      name: shield.fields.name,
      description: `Shield. Armor Class: +${shield.fields.ac_base}. Cost: ${amount(item?.cost)} GP. Weight: ${amount(item?.weight)} lb.`,
      rarity: "common",
      slot: "shield",
      abilities: [{ id: "shield-ac", name: "Shield", description: `+${shield.fields.ac_base} Armor Class while you hold the Shield.`, trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: shield.fields.ac_base }] }],
    },
  ];
}

export function convertArtifacts(data: Open5eData): ArtifactRow[] {
  const assignments = groupBy(data.weaponAssignments, (a) => a.fields.weapon);

  return [...data.weapons.map((w) => convertWeapon(w, data, assignments)), ...convertShield(data)].sort(bySlug);
}
