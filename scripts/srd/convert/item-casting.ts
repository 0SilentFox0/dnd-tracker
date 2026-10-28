import type { Open5eData } from "../lib/open5e";
import type { ArtifactRow } from "../lib/types";

import type { Ability } from "@/lib/utils/abilities/schema";
import type { ItemStats } from "@/lib/utils/items/item-stats";

const RESISTANCE_TYPES = ["acid", "cold", "fire", "force", "lightning", "necrotic", "poison", "psychic", "radiant", "thunder"];

const RIDERS: Record<string, { types: string[]; amount: string; damageType?: string }> = {
  "Sun Blade": { types: ["undead"], amount: "1d8", damageType: "radiant" },
  "Holy Avenger": { types: ["fiend", "undead"], amount: "2d10", damageType: "radiant" },
  "Mace of Disruption": { types: ["fiend", "undead"], amount: "2d6", damageType: "radiant" },
  "Dragon Slayer": { types: ["dragon"], amount: "3d6" },
  "Giant Slayer": { types: ["giant"], amount: "2d6" },
};

export function applyItemCasting(rows: ArtifactRow[], data: Open5eData): ArtifactRow[] {
  const spellsByName = new Map(data.spells.map((s) => [s.fields.name, s.fields]));

  const out = rows.map((row): ArtifactRow => {
    const spells: NonNullable<ItemStats["spells"]> = [];

    const dc = /save DC (\d+)/i.exec(row.description)?.[1];

    if (row.item?.charges) {
      for (const line of row.description.split("\n")) {
        const cells = line.split("|").slice(1, -1).map((s) => s.trim().replace(/\*/g, ""));

        const known = spellsByName.get(cells[0]);

        if (known && /^\d+$/.test(cells[1] ?? "") && Number(cells[1]) >= 0 && Number(cells[1]) <= 50) spells.push({ spellId: cells[0], cost: Number(cells[1]), castLevel: known.level, ...(dc && { dc: Number(dc) }) });
      }

      if (["Wand of Fireballs", "Wand of Lightning Bolts"].includes(row.name)) {
        const spellId = row.name === "Wand of Fireballs" ? "Fireball" : "Lightning Bolt";

        if (spellsByName.has(spellId) && /no more than 3 charges/.test(row.description) && /For 1 charge/.test(row.description)) spells.push({ spellId, cost: 1, castLevel: 3, ...(dc && { dc: Number(dc) }), upcast: { maxLevel: 5, extraCost: 1 } });
      }
    }

    const parameter = /^(?:Armor|Ring|Potion) of Resistance$/.test(row.name) ? { kind: "damageType" as const, options: RESISTANCE_TYPES.map((key) => ({ key, label: key })) } : undefined;

    const rider = RIDERS[row.name];

    const abilities: Ability[] = [...(row.abilities ?? [])];

    if (parameter && !row.item?.consumable) abilities.push({ id: "parameter-resistance", name: "Resistance ({param})", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "{param}", percent: 50 }] });

    if (rider) abilities.push({ id: "creature-rider", name: `Extra damage (${rider.types.join(", ")})`, trigger: { event: "hit", role: "attacker" }, condition: { type: "all", conditions: [{ type: "withThisItem" }, { type: "targetCreatureType", types: rider.types }] }, effects: [{ kind: "dealDamage", amount: rider.amount, ...(rider.damageType && { damageType: rider.damageType }), target: "eventTarget" }] });

    return { ...row, item: { ...row.item, ...(spells.length > 0 && { spells: [...new Map(spells.map((s) => [s.spellId, s])).values()] }), ...(parameter && { parameter, ...(row.item?.property && { property: { ...row.item.property, nameTemplate: `${row.item.property.nameTemplate ?? "{base}"} ({param})` } }) }) }, ...(abilities.length > 0 && { abilities }) };
  });

  const scroll = data.items.find((i) => i.pk === "srd-2024_spell-scroll");

  if (scroll) for (const level of [0, 1]) {
    const spells = data.spells.filter((s) => s.fields.level === level).map((s) => ({ spellId: s.fields.name, cost: 1, castLevel: level, dc: 13, attackBonus: 5 }));

    out.push({ slug: `srd-2024_spell-scroll-${level}`, name: level === 0 ? "Spell Scroll (Cantrip)" : "Spell Scroll (Level 1)", description: `${scroll.fields.desc}\nПраво читати сувій визначає ДМ. Автоматизовано каст, DC та списання.`, rarity: "common", slot: "item", item: { unique: false, consumable: true, ...(spells.length > 0 && { spells }) } });
  }

  return out;
}
