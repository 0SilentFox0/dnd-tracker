import type { Fixture, O5MagicItem, Open5eData } from "../lib/open5e";
import { bySlug } from "../lib/text";
import type { ArtifactRow } from "../lib/types";
import { BELT_STRENGTH, CONSUMABLE_NAME_RE, DRAGON_SLAYER_PK, DROPPED_GENERIC, FAMILY_NAMES, HEALING_POTIONS, POTIONS_OF_HEALING_PK, PROPERTY_OVERRIDES, QUARTERSTAFF_PK, UNIQUE_BASES, WONDROUS_SLOTS } from "../overrides/magic-items";

import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import type { Ability, Effect } from "@/lib/utils/abilities/schema";
import { composedName } from "@/lib/utils/items/compose";
import type { ItemKind, ItemStats } from "@/lib/utils/items/item-stats";

export const RARITY: Record<string, ArtifactRow["rarity"]> = { common: "common", uncommon: "uncommon", rare: "rare", "very-rare": "epic", legendary: "legendary", artifact: "legendary" };

export const EXPEND_CHARGE: Ability = {
  id: "charge",
  name: "Expend a charge",
  description: "Spends one charge; what each effect costs is in the item description.",
  trigger: { event: "action" },
  limits: { pool: { key: "charges", cost: 1 } },
  effects: [{ kind: "note", text: "Expend a charge" }],
};

const DAMAGE_TYPES = "Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder";

const ABILITY_NAMES = "Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma";

// a rider that depends on the creature type, a charge, a throw or a daily use stays text
const GATED = /\b(Aberrations?|Beasts?|Celestials?|Constructs?|Dragons?|Elementals?|Fey|Fiends?|Giants?|Humanoids?|Monstrosit(?:y|ies)|Oozes?|Plants?|Undead|sworn|charges?|throw|dawn)\b/i;

const SKILL_BY_NAME: Record<string, DndSkill> = Object.fromEntries(DND_SKILLS.map((k) => [k.replace(/([A-Z])/g, " $1").toLowerCase(), k]));

const passive = (id: string, name: string, effects: Effect[], condition?: Ability["condition"]): Ability => ({ id, name, trigger: { event: "passive" }, ...(condition && { condition }), effects });

const sentences = (desc: string) => desc.replace(/\*\*_?([^*_]+)_?\*\*/g, "$1").split(/(?<=[.!?])\s+/);

export function familyTemplate(variantName: string, baseName: string): string | null {
  if (variantName.includes(baseName)) return variantName.replace(baseName, "{base}");

  const short = baseName.replace(/ Armor$/, "");

  return short !== baseName && variantName.includes(short) ? variantName.replace(short, "{base}") : null;
}

export const normalizeItemName = (s: string) => s.toLowerCase().replace(/\barmor\b/g, "").replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();

export function chargesOf(desc: string): ItemStats["charges"] | null {
  const m = /(?:has|starts with) (?:(\d+)d(\d+)(?: ?\+ ?(\d+))?|(\d+)) charges/i.exec(desc);

  if (!m) return null;

  const max = m[4] ? Number(m[4]) : Number(m[1]) * Number(m[2]) + Number(m[3] ?? 0);

  const regain = /regains? [^.]*?(dawn|long rest|short rest)/i.exec(desc)?.[1]?.toLowerCase();

  return { max: Math.min(50, Math.max(1, max)), rest: regain === "short rest" ? "short" : regain ? "long" : null };
}

type Mechanics = { abilities: Ability[]; weapon?: { attackBonus: number; damageBonus: number } };

export function mechanize(desc: string, ctx: { weapon: boolean }): Mechanics {
  const abilities: Ability[] = [];

  const plus = ctx.weapon ? /\+(\d) bonus to attack (?:rolls )?and damage rolls/.exec(desc)?.[1] : undefined;

  const ac = /\+(\d) bonus to (?:your )?Armor Class(?! against)/.exec(desc)?.[1];

  if (ac) abilities.push(passive("ac", "Armor Class", [{ kind: "modifyStat", stat: "armor", flat: Number(ac) }], /no armor and (?:using )?no Shield/i.test(desc) ? { type: "armorWorn", categories: ["none"], shield: "without" } : undefined));

  const saves = /\+(\d) bonus to (?:your )?(?:Armor Class(?:,| and) )?saving throws/.exec(desc)?.[1];

  if (saves) abilities.push(passive("saves", "Saving Throws", [{ kind: "modifyStat", stat: "savingThrow", flat: Number(saves) }]));

  const resist = [...new Set([...desc.matchAll(new RegExp(`(?:you have|you gain|grants? you|gives? you) Resistance to (${DAMAGE_TYPES}) damage`, "gi"))].map((m) => m[1].toLowerCase()))];

  for (const type of resist) abilities.push(passive(`resist-${type}`, `Resistance: ${type}`, [{ kind: "flag", flag: "resistance", damageType: type, percent: 50 }]));

  const score = new RegExp(`your (${ABILITY_NAMES}) (?:score )?is (\\d+)`, "i").exec(desc);

  if (score) abilities.push(passive(`score-${score[1].toLowerCase()}`, score[1], [{ kind: "modifyStat", stat: score[1].toLowerCase() as "strength", atLeast: Number(score[2]) }]));

  const skills = [...new Set([...desc.matchAll(new RegExp(`Advantage on (?:${ABILITY_NAMES}) \\(([A-Za-z ]+)\\) checks`, "g"))].flatMap((m) => SKILL_BY_NAME[m[1].toLowerCase()] ?? []))];

  if (skills.length > 0) abilities.push(passive("checks", "Advantage on checks", [{ kind: "flag", flag: "checkAdvantage", skills }]));

  if (/Advantage on saving throws against spells/i.test(desc)) abilities.push(passive("save-spells", "Advantage vs spells", [{ kind: "flag", flag: "saveAdvantage", abilities: "all", vsSpells: true }]));

  if (/Critical Hit against you becomes a normal hit/i.test(desc)) abilities.push(passive("crit-immunity", "Critical Hit immunity", [{ kind: "flag", flag: "critImmunity" }]));

  if (ctx.weapon) {
    for (const s of sentences(desc)) {
      const m = new RegExp(`extra (\\d+d\\d+)(?: (${DAMAGE_TYPES}))? damage`).exec(s);

      if (!m || GATED.test(s)) continue;

      abilities.push({ id: "rider", name: "Extra damage", trigger: { event: "hit", role: "attacker" }, condition: { type: "withThisItem" }, effects: [{ kind: "dealDamage", amount: m[1], ...(m[2] && { damageType: m[2].toLowerCase() }), target: "eventTarget" }] });

      break;
    }
  }

  return { abilities, ...(plus && { weapon: { attackBonus: Number(plus), damageBonus: Number(plus) } }) };
}

export interface MagicVariant {
  pk: string;
  name: string;
  desc: string;
  rarity: string;
  attunement: boolean;
  base: ArtifactRow;
  kind: "weapon" | "armor";
}

export function magicVariants(data: Open5eData, gear: readonly ArtifactRow[]): MagicVariant[] {
  const gearBySlug = new Map(gear.map((g) => [g.slug, g]));

  return data.magicItems.flatMap(({ pk, fields: f }: Fixture<O5MagicItem>) => {
    const fk = f.weapon ?? f.armor;

    const base = fk ? gearBySlug.get(fk) : undefined;

    return base ? [{ pk, name: f.name, desc: f.desc, rarity: f.rarity, attunement: f.requires_attunement, base, kind: f.weapon ? ("weapon" as const) : ("armor" as const) }] : [];
  });
}

const kindOf = (row: ArtifactRow): ItemKind => (row.slot === "weapon" || row.slot === "range_weapon" ? "weapon" : row.slot === "shield" ? "shield" : "armor");

const slugOf = (name: string) => `srd-2024_${name.toLowerCase().replace(/\+/g, "plus-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

function appliesTo(variants: readonly MagicVariant[], gear: readonly ArtifactRow[]): NonNullable<ItemStats["property"]>["appliesTo"] {
  const kinds = [...new Set(variants.map((v) => kindOf(v.base)))].sort();

  const names = [...new Set(variants.map((v) => v.base.name))].sort();

  const covered = kinds.every((k) => gear.filter((g) => kindOf(g) === k).every((g) => names.includes(g.name)));

  return covered ? { kinds } : { kinds, bases: names };
}

function propertyRow(name: string, template: string, variants: MagicVariant[], gear: readonly ArtifactRow[]): ArtifactRow {
  const first = [...variants].sort((a, b) => a.pk.localeCompare(b.pk))[0];

  const kind = first.kind;

  const nPlus = /\(\+(\d)\)/.exec(template)?.[1];

  const mech: Mechanics = nPlus
    ? { abilities: kind === "armor" ? [passive("ac", "Armor Class", [{ kind: "modifyStat", stat: "armor", flat: Number(nPlus) }])] : [], ...(kind === "weapon" && { weapon: { attackBonus: Number(nPlus), damageBonus: Number(nPlus) } }) }
    : mechanize(first.desc, { weapon: kind === "weapon" });

  const charges = chargesOf(first.desc);

  const override = PROPERTY_OVERRIDES[name] ?? {};

  const attunement = variants.filter((v) => v.attunement).length * 2 > variants.length;

  const abilities = [...mech.abilities.filter((a) => !override.dropAbilities?.includes(a.id)), ...(override.abilities ?? []), ...(charges ? [EXPEND_CHARGE] : [])];

  return {
    slug: slugOf(name),
    name,
    description: first.desc,
    rarity: RARITY[first.rarity],
    slot: kind === "weapon" ? "weapon" : "armor",
    ...(mech.weapon && { weapon: mech.weapon }),
    item: {
      unique: false,
      property: { appliesTo: appliesTo(variants, gear), nameTemplate: template, ...(override.overrides && { overrides: override.overrides }) },
      ...(attunement && { attunement: true }),
      ...(charges && { charges }),
    },
    ...(abilities.length > 0 && { abilities }),
  };
}

export function convertMagicProperties(data: Open5eData, gear: readonly ArtifactRow[]): ArtifactRow[] {
  const families = new Map<string, MagicVariant[]>();

  const problems: string[] = [];

  for (const v of magicVariants(data, gear)) {
    const template = familyTemplate(v.name, v.base.name);

    const key = template && `${v.kind}:${template}`;

    if (!key || !FAMILY_NAMES[key]) {
      problems.push(`${v.name}: no family (${key ?? "no template"})`);

      continue;
    }

    if (normalizeItemName(composedName(v.base, { name: FAMILY_NAMES[key] }, template ?? undefined)) !== normalizeItemName(v.name)) problems.push(`${v.name}: composed name mismatch`);

    families.set(key, [...(families.get(key) ?? []), v]);
  }

  if (problems.length > 0) throw new Error(`magic item families:\n${problems.join("\n")}`);

  const rows = [...families].map(([key, variants]) => propertyRow(FAMILY_NAMES[key], key.slice(key.indexOf(":") + 1), variants, gear));

  const slayer = data.magicItems.find((m) => m.pk === DRAGON_SLAYER_PK);

  if (slayer) {
    const mech = mechanize(slayer.fields.desc, { weapon: true });

    rows.push({
      slug: slayer.pk,
      name: slayer.fields.name,
      description: slayer.fields.desc,
      rarity: RARITY[slayer.fields.rarity],
      slot: "weapon",
      ...(mech.weapon && { weapon: mech.weapon }),
      item: { unique: false, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Dragon Slayer ({base})" }, ...(slayer.fields.requires_attunement && { attunement: true }) },
      ...(mech.abilities.length > 0 && { abilities: mech.abilities }),
    });
  }

  return rows.sort(bySlug);
}

const USE: Ability = { id: "use", name: "Use", description: "Uses one; the effect is in the item description.", trigger: { event: "action" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "note", text: "Use the item" }] };

const DRINK: Ability = { ...USE, id: "drink", name: "Drink", trigger: { event: "bonusAction" }, effects: [{ kind: "note", text: "Drink the potion" }] };

function uniqueSlot(f: O5MagicItem): ArtifactRow["slot"] {
  if (f.category === "ring") return "ring";

  if (f.category === "wondrous-item") return WONDROUS_SLOTS.find(([re]) => re.test(f.name))?.[1] ?? "item";

  return "item";
}

function baseFor(pk: string, f: O5MagicItem, gearBySlug: ReadonlyMap<string, ArtifactRow>) {
  const fixed = UNIQUE_BASES[pk];

  if (fixed) return { base: gearBySlug.get(fixed.base), overrides: fixed.overrides };

  return f.category === "staff" && /Quarterstaff/.test(f.desc) ? { base: gearBySlug.get(QUARTERSTAFF_PK), overrides: undefined } : null;
}

function uniqueRow({ pk, fields: f }: Fixture<O5MagicItem>, gearBySlug: ReadonlyMap<string, ArtifactRow>): ArtifactRow {
  const consumable = f.category === "potion" || CONSUMABLE_NAME_RE.test(f.name);

  const fixed = consumable ? null : baseFor(pk, f, gearBySlug);

  const base = fixed?.base;

  const mech: Mechanics = consumable ? { abilities: [] } : mechanize(f.desc, { weapon: !!base?.weapon });

  const belt = BELT_STRENGTH[pk];

  const charges = consumable ? null : chargesOf(f.desc);

  const weapon = base?.weapon && {
    ...base.weapon,
    ...(fixed?.overrides?.damageType && { damageType: fixed.overrides.damageType }),
    ...(fixed?.overrides?.addTraits && { traits: [...new Set([...(base.weapon.traits ?? []), ...fixed.overrides.addTraits])] }),
    ...mech.weapon,
  };

  const abilities = [
    ...(base?.abilities ?? []),
    ...mech.abilities,
    ...(belt ? [passive("score-strength", "Strength", [{ kind: "modifyStat", stat: "strength", atLeast: belt }])] : []),
    ...(charges ? [EXPEND_CHARGE] : []),
    ...(consumable ? [f.category === "potion" ? DRINK : USE] : []),
  ];

  return {
    slug: pk,
    name: f.name,
    description: f.desc,
    rarity: RARITY[f.rarity],
    slot: base?.slot ?? uniqueSlot(f),
    ...(weapon && { weapon }),
    ...(base?.armor && { armor: base.armor }),
    item: {
      ...(f.rarity !== "artifact" && { unique: false }),
      ...(f.requires_attunement && !consumable && { attunement: true }),
      ...(charges && { charges }),
      ...(consumable && { consumable: true }),
    },
    ...(abilities.length > 0 && { abilities }),
  };
}

function healingPotions(data: Open5eData): ArtifactRow[] {
  const table = data.items.find((i) => i.pk === POTIONS_OF_HEALING_PK);

  if (!table) return [];

  return HEALING_POTIONS.map((p) => ({
    slug: p.slug,
    name: p.name,
    description: `${table.fields.desc.split("\n")[0]} ${p.name} regains ${p.heal.replace("+", " + ")} Hit Points. As a Bonus Action, you can drink it or administer it to another creature within 5 feet of yourself.`,
    rarity: p.rarity,
    slot: "item",
    item: { unique: false, consumable: true },
    abilities: [{ id: "drink", name: "Drink", trigger: { event: "bonusAction" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "heal", amount: p.heal, target: "self" }] }],
  }));
}

export function convertMagicUniques(data: Open5eData, gear: readonly ArtifactRow[]): ArtifactRow[] {
  const gearBySlug = new Map(gear.map((g) => [g.slug, g]));

  const skip = new Set([...DROPPED_GENERIC, DRAGON_SLAYER_PK]);

  const rows = data.magicItems.filter((m) => !m.fields.weapon && !m.fields.armor && !skip.has(m.pk)).map((m) => uniqueRow(m, gearBySlug));

  return [...rows, ...healingPotions(data)].sort(bySlug);
}

export const convertMagicItems = (data: Open5eData, gear: readonly ArtifactRow[]): ArtifactRow[] => [...convertMagicProperties(data, gear), ...convertMagicUniques(data, gear)].sort(bySlug);

export { applyItemCasting } from "./item-casting";
