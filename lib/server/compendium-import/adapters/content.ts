import { renderEntries } from "../entries";
import { nestedId, stableJson } from "../identity";
import { type Adapter, issue } from "../types";
import { ABILITIES, array, description, num, object, str, unsupported } from "./shared";

import { buildSearchText } from "@/lib/utils/scenario/search-text";
import type { ScenarioContent } from "@/types/scenario";

function simpleAttack(value: unknown): Record<string, unknown> | undefined {
  const action = object(value);

  const entries = array(action.entries);

  if (entries.length !== 1 || typeof entries[0] !== "string") return;

  const match = /^\{@atk (mw|rw)\}\s+\{@hit ([+-]?\d+)\}\s+to hit,\s+((?:reach|range) [\d/]+ ft\.),\s+one target\.\s+\{@h\}(?:\d+\s*\()?\{@damage (\d+d\d+(?:\s*[+-]\s*\d+)?)\}\)?\s+(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder) damage\.?$/i.exec(entries[0]);

  if (!match) return;

  return { name: action.name, type: match[1].toLowerCase() === "mw" ? "melee" : "ranged", attackBonus: Number(match[2]), range: match[3], damageDice: match[4], damageType: match[5].toLowerCase() };
}

export const spell: Adapter = (row, ctx) => {
  ctx.issues.push(issue("MANUAL_SPELL", ctx.path, "warning", "Налаштуйте механіку заклинання або застосовуйте його вручну"));

  return { kind: "spells", body: { name: row.name, level: row.level, description: description(row, ctx), executionMode: "manual", cost: "action", targeting: { kind: "self" }, resolution: { kind: "auto" }, dice: 0, spellEffects: [], concentration: array(row.duration).some((d) => object(d).concentration === true), lists: array(object(row.classes).fromClassList).map((r) => str(object(r).name)).filter(Boolean) }, notes: unsupported(row, ["level", "school", "classes"], ctx) };
};

export const monster: Adapter = (row, ctx) => {
  const ac = array(row.ac).map((v) => num(v) ?? num(object(v).ac)).find((v) => v !== undefined);

  const hp = num(object(row.hp).average);

  if (ac === undefined || hp === undefined || hp < 1) ctx.issues.push(issue("REQUIRED_MONSTER_STATS", ctx.path, "error", "Укажіть числові HP та AC або виключіть монстра"));

  const scores = Object.fromEntries(Object.entries(ABILITIES).map(([short, long]) => [long, num(row[short])]));

  if (Object.values(scores).some((v) => v === undefined)) ctx.issues.push(issue("MONSTER_ABILITY_REQUIRED", ctx.path, "error", "Укажіть усі шість характеристик"));

  const rawCr = str(row.cr) || str(object(row.cr).cr);

  const cr = /^\d+\/\d+$/.test(rawCr) ? Number(rawCr.split("/")[0]) / Number(rawCr.split("/")[1]) : rawCr ? Number(rawCr) : null;

  const movement = object(row.speed);

  const type = str(row.type) || str(object(row.type).type);

  const sizes: Record<string, string> = { T: "tiny", S: "small", M: "medium", L: "large", H: "huge", G: "gargantuan" };

  const attacks = array(row.action).flatMap((action) => simpleAttack(action) ?? []);

  const statblock = { ...(type && { creatureType: type }), ...(sizes[str(array(row.size)[0])] && { size: sizes[str(array(row.size)[0])] }), ...(Array.isArray(row.languages) && { languages: row.languages.map(str).join(", ") }), movement: Object.fromEntries(["fly", "swim", "climb", "burrow"].filter((s) => num(movement[s]) !== undefined).map((s) => [s, movement[s]])) };

  const notes = [description(row, ctx), ...["trait", "action", "bonus", "reaction", "legendary", "spellcasting"].map((field) => {
    const rendered = renderEntries(row[field], `${ctx.path}.${field}`);

    ctx.issues.push(...rendered.issues);

    if (row[field] !== undefined) ctx.issues.push(issue("MANUAL_MONSTER_ACTION", `${ctx.path}.${field}`, "warning", "Використовуйте текст дії вручну або налаштуйте її механіку"));

    return field === "spellcasting" && row[field] !== undefined ? `${rendered.text}\n${stableJson(row[field])}` : rendered.text;
  }), unsupported(row, ["ac", "hp", "cr", "speed", "size", "type", "languages", ...Object.keys(ABILITIES), "trait", "action", "bonus", "reaction", "legendary", "spellcasting"], ctx)].filter(Boolean).join("\n");

  return { kind: "units", body: { name: row.name, ...scores, armorClass: ac, maxHp: hp, speed: num(movement.walk) ?? (num(row.speed) ?? 0), gridSize: str(array(row.size)[0]) === "L" ? 2 : ["H", "G"].includes(str(array(row.size)[0])) ? 3 : 1, cr, statblock, attacks, abilities: [] }, notes };
};

const DAMAGE: Record<string, string> = { P: "piercing", S: "slashing", B: "bludgeoning", A: "acid", C: "cold", F: "fire", L: "lightning", N: "necrotic", O: "force", R: "radiant", T: "thunder", Y: "psychic", I: "poison" };

export const item: Adapter = (row, ctx) => {
  const type = str(row.type).split("|")[0];

  const slots: Record<string, string> = { M: "weapon", R: "range_weapon", S: "shield", LA: "armor", MA: "armor", HA: "armor", RG: "ring" };

  const slot = slots[type] ?? "item";

  const rarity = str(row.rarity);

  const rarities: Record<string, string> = { common: "common", uncommon: "uncommon", rare: "rare", "very rare": "epic", legendary: "legendary" };

  const body: Record<string, unknown> = { name: row.name, description: description(row, ctx), slot, item: { unique: ctx.inputKind !== "baseitem", ...(row.reqAttune !== undefined && { attunement: row.reqAttune !== false }) } };

  if (rarities[rarity]) body.rarity = rarities[rarity];

  if (["M", "R"].includes(type) && typeof row.dmg1 === "string") body.weapon = { damageDice: row.dmg1, damageType: DAMAGE[str(row.dmgType)] ?? str(row.dmgType), attackType: type === "M" ? "melee" : "ranged", ...(typeof row.dmg2 === "string" && { versatileDice: row.dmg2 }) };

  if (["LA", "MA", "HA"].includes(type) && num(row.ac) !== undefined) body.armor = { category: { LA: "light", MA: "medium", HA: "heavy" }[type], base: row.ac, ...(type === "MA" && { dexCap: 2 }), ...(type === "HA" && { dexCap: 0 }) };

  return { kind: "artifacts", body, notes: unsupported(row, ["type", "rarity", "dmg1", "dmg2", "dmgType", "ac", "reqAttune"], ctx) };
};

export const materialPage: Adapter = (row, ctx) => {
  const rendered = renderEntries(row.entries ?? row, ctx.path);

  ctx.issues.push(...rendered.issues);

  const text = rendered.text || stableJson(row);

  const id = nestedId(ctx.key);

  const content: ScenarioContent = { legend: [], sections: [{ id, title: str(row.name) || "Матеріали", played: false, rows: [{ id: `${id}-row`, story: { type: "doc", content: [] }, notes: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] } }] }] };

  return { kind: "scenarioPages", body: { kind: "note", status: "draft", characterId: null, title: row.name, content, searchText: buildSearchText(str(row.name), content), version: 0 }, notes: "" };
};
