/* eslint-disable no-restricted-syntax -- derived content written to the DB stays Ukrainian (spec part5, decision 5) */
import { renderEntries } from "../entries";
import { nestedId, stableJson } from "../identity";
import { type Adapter, issue } from "../types";
import { EFFECT_FIELDS, itemEffects } from "./item-effects";
import { type MonsterStats, parseAttack, parseMultiattack, plainName } from "./monster-attacks";
import { CastingBuilder, defenseAbilities, legendaryAbilities, legendaryResistances, saveProficiencies } from "./monster-traits";
import { ABILITIES, array, description, num, object, str, unsupported } from "./shared";
import { spellCast } from "./spell-cast";
import { deriveSpell } from "./spell-derive";

import type { AbilityKey } from "@/lib/constants/abilities";
import { schoolByCode } from "@/lib/constants/spell-groups";
import type { Ability } from "@/lib/utils/abilities/schema";
import { buildSearchText } from "@/lib/utils/scenario/search-text";
import { castingFields, spellHead } from "@/lib/utils/spells/derive/mechanics";
import { battleSpeed, coreTrait } from "@/lib/utils/units/monster-core-traits";
import type { ScenarioContent } from "@/types/scenario";

const SPELL_CONSUMED = ["level", "school", "classes", "time", "range", "components", "duration", "meta", "damageInflict", "savingThrow", "spellAttack", "scalingLevelDice", "conditionInflict", "damageImmune", "damageResist", "damageVulnerable", "conditionImmune", "abilityCheck", "areaTags", "miscTags"];

const MANUAL_SPELL_BODY = { executionMode: "manual", targeting: { kind: "self" }, resolution: { kind: "auto" }, dice: 0, spellEffects: [] };

export const spell: Adapter = (row, ctx) => {
  const cast = spellCast(row);

  const lists = array(object(row.classes).fromClassList).map((r) => str(object(r).name)).filter(Boolean);

  const school = schoolByCode(str(row.school))?.name ?? str(row.school);

  const head = spellHead({ level: row.level as number, school, casting: cast.castingText, ritual: cast.ritual, range: cast.rangeText, components: cast.components, duration: cast.durationText, concentration: cast.concentration, classes: lists });

  const text = renderEntries(row.entries, `${ctx.path}.entries`);

  const derived = deriveSpell(row, text.text, renderEntries(row.entriesHigherLevel).text, cast);

  const mechanics = "native" in derived ? { executionMode: "native", ...derived.native.fields } : MANUAL_SPELL_BODY;

  if ("blocker" in derived) ctx.issues.push(issue(`MANUAL_SPELL_${derived.blocker}`, ctx.path, "warning", derived.detail));
  else if (derived.native.narrative) ctx.issues.push(issue("SPELL_NARRATIVE_ONLY", ctx.path, "warning"));
  else if (derived.native.riders.length > 0) ctx.issues.push(issue("SPELL_RIDER_MANUAL", ctx.path, "warning", { riders: derived.native.riders.join(", ") }));

  return { kind: "spells", body: { name: row.name, level: row.level, description: [head, description(row, ctx)].filter(Boolean).join("\n\n"), ...mechanics, ...castingFields(cast.castingKey, cast.trigger), concentration: cast.concentration, lists }, notes: unsupported(row, SPELL_CONSUMED, ctx) };
};

const MONSTER_FIELDS = ["trait", "action", "bonus", "reaction", "legendary", "spellcasting"] as const;

const renderRaw = (entries: unknown[]): string => entries.map((e) => (typeof e === "string" ? e : "")).join(" ");

export const monster: Adapter = (row, ctx) => {
  const movement = object(row.speed);

  const ac = array(row.ac).map((v) => num(v) ?? num(object(v).ac)).find((v) => v !== undefined);

  const hpRow = object(row.hp);

  const special = /^\s*(\d[\d,]*)\s*\(/.exec(str(hpRow.special))?.[1];

  const parsedHp = num(hpRow.average) ?? (special ? Number(special.replace(/,/g, "")) : undefined);

  const hp = parsedHp !== undefined && parsedHp >= 1 ? parsedHp : undefined;

  if (hp === undefined && typeof hpRow.special === "string") ctx.issues.push(issue("MANUAL_MONSTER_HP", `${ctx.path}.hp`, "warning", { value: hpRow.special }));
  else if (ac === undefined || hp === undefined) ctx.issues.push(issue("REQUIRED_MONSTER_STATS", ctx.path, "error"));

  const scores = Object.fromEntries(Object.entries(ABILITIES).map(([short, long]) => [long, num(row[short])]));

  if (Object.values(scores).some((v) => v === undefined)) ctx.issues.push(issue("MONSTER_ABILITY_REQUIRED", ctx.path, "error"));

  const rawCr = str(row.cr) || str(object(row.cr).cr);

  const cr = /^\d+\/\d+$/.test(rawCr) ? Number(rawCr.split("/")[0]) / Number(rawCr.split("/")[1]) : rawCr ? Number(rawCr) : null;

  const speeds = Object.fromEntries(["walk", "fly", "swim", "climb", "burrow"].map((k) => [k, num(movement[k]) ?? num(object(movement[k]).number)]));

  const type = str(row.type) || str(object(row.type).type);

  const sizes: Record<string, string> = { T: "tiny", S: "small", M: "medium", L: "large", H: "huge", G: "gargantuan" };

  const complete = Object.values(scores).every((v) => v !== undefined);

  const stats: MonsterStats = { scores: complete ? (scores as Record<AbilityKey, number>) : null, cr: cr !== null && Number.isFinite(cr) ? cr : null };

  const casting = new CastingBuilder(ctx.edition);

  const manual = (field: string, index: number, name: string) => ctx.issues.push(issue("MANUAL_MONSTER_ACTION", `${ctx.path}.${field}[${index}]`, "warning", { variant: "action", name }));

  const unhandled: Record<string, unknown[]> = {};

  const keep = (field: string, item: unknown) => (unhandled[field] ??= []).push(item);

  const attacks: Array<Record<string, unknown>> = [];

  let multiattack = 1;

  const abilities: Ability[] = [];

  let resistances: ReturnType<typeof legendaryResistances>;

  for (const field of MONSTER_FIELDS) {
    for (const [index, item] of array(row[field]).entries()) {
      const entry = object(item);

      const name = plainName(str(entry.name));

      if (field === "spellcasting") {
        casting.block(item);
        keep(field, { name, entries: array(entry.headerEntries) });
        continue;
      }

      if (field === "legendary") {
        keep(field, item);
        continue;
      }

      const entries = array(entry.entries);

      const core = field === "trait" ? coreTrait(name, renderRaw(entries)) : undefined;

      if (core) {
        abilities.push({ id: `trait-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || index}`, name, description: renderEntries(entries).text, ...core });
        continue;
      }

      if (field === "trait" && /^Legendary Resistance \(\d+\/Day/i.test(name)) {
        resistances = legendaryResistances([item]);
        continue;
      }

      if (field === "action") {
        const multi = parseMultiattack({ name, entries });

        if (multi) {
          multiattack = multi.count;
          keep(field, item);

          if (multi.complex) ctx.issues.push(issue("MANUAL_MULTIATTACK_DETAIL", `${ctx.path}.action[${index}]`, "warning"));

          continue;
        }

        const parsed = parseAttack({ name: str(entry.name), entries }, stats);

        if (parsed) {
          attacks.push(parsed.row);

          if (parsed.rider) ctx.issues.push(issue("MANUAL_ATTACK_RIDER", `${ctx.path}.action[${index}]`, "warning", { name }));

          if (parsed.mixedDamage) ctx.issues.push(issue("MONSTER_ATTACK_MIXED_DAMAGE", `${ctx.path}.action[${index}]`, "warning", { name }));

          continue;
        }
      }

      if (field !== "trait" && casting.action(str(entry.name), renderRaw(entries))) {
        keep(field, item);
        continue;
      }

      keep(field, item);
      manual(field, index, name || `#${index + 1}`);
    }
  }

  const defenses = defenseAbilities(row);

  abilities.push(...defenses.abilities);

  for (const text of defenses.unresolved) ctx.issues.push(issue("MANUAL_MONSTER_DEFENSE", `${ctx.path}.defenses`, "warning", { text }));

  if (defenses.nonMagicalApprox) ctx.issues.push(issue("MONSTER_NONMAGICAL_APPROX", `${ctx.path}.defenses`, "warning"));

  const legendary = legendaryAbilities(row.legendary, attacks.map((a) => String(a.name)));

  abilities.push(...legendary.abilities);

  for (const name of legendary.manual) ctx.issues.push(issue("MANUAL_MONSTER_ACTION", `${ctx.path}.legendary`, "warning", { variant: "legendary", name }));

  const built = casting.build();

  if (built?.approximate) ctx.issues.push(issue("MONSTER_SPELL_SLOTS_APPROX", `${ctx.path}.spellcasting`, "warning"));

  for (const key of built?.unresolved ?? []) ctx.issues.push(issue("MANUAL_MONSTER_ACTION", `${ctx.path}.${key}`, "warning", { variant: "spells" }));

  const statblock = { ...(type && { creatureType: type }), ...(sizes[str(array(row.size)[0])] && { size: sizes[str(array(row.size)[0])] }), ...(Array.isArray(row.languages) && { languages: row.languages.map(str).join(", ") }), ...(resistances?.lair !== undefined && { lairResistances: resistances.lair }), movement: { ...Object.fromEntries(["fly", "swim", "climb", "burrow"].filter((k) => (speeds[k] ?? 0) >= 5).map((k) => [k, speeds[k]])), ...(movement.canHover === true && { hover: true }) } };

  const notes = [description(row, ctx), ...MONSTER_FIELDS.map((field) => {
    const rendered = renderEntries(unhandled[field] ?? [], `${ctx.path}.${field}`);

    ctx.issues.push(...rendered.issues);

    return rendered.text;
  }), unsupported(row, ["ac", "hp", "cr", "speed", "size", "type", "languages", "save", "resist", "immune", "vulnerable", "conditionImmune", "legendaryActions", ...Object.keys(ABILITIES), ...MONSTER_FIELDS], ctx)].filter(Boolean).join("\n");

  const legendaryCount = num(row.legendaryActions) ?? (legendary.abilities.length > 0 ? 3 : 0);

  return {
    kind: "units",
    refs: built?.refs,
    body: { name: row.name, ...scores, armorClass: ac, maxHp: hp ?? 1, speed: battleSpeed(speeds) || (num(row.speed) ?? 0), gridSize: str(array(row.size)[0]) === "L" ? 2 : ["H", "G"].includes(str(array(row.size)[0])) ? 3 : 1, cr, statblock, attacks, abilities, multiattack, saveProficiencies: saveProficiencies(row.save, stats.scores), legendaryActions: Math.min(5, legendaryCount), legendaryResistances: Math.min(10, resistances?.count ?? 0), ...(built && { spellcasting: built.config }) },
    notes,
  };
};

const DAMAGE: Record<string, string> = { P: "piercing", S: "slashing", B: "bludgeoning", A: "acid", C: "cold", F: "fire", L: "lightning", N: "necrotic", O: "force", R: "radiant", T: "thunder", Y: "psychic", I: "poison" };

const CONSUMABLE_TYPES = new Set(["P", "SC", "A", "AF", "EXP", "FD"]);

const CONSUMABLE_TYPE_NAME = /^(?:ingredient|potion|scroll|ammunition|food|drink)/i;

const UNIQUE_RARITIES = new Set(["artifact", "unknown", "unknown (magic)"]);

const OTHER_EFFECT_FIELDS = /^(?:bonus|modifySpeed$|attachedSpells$|charges$|recharge|grantsProficiency$|conditionImmune$|immune$|vulnerable$|ability$|crit)/;

export const item: Adapter = (row, ctx) => {
  const type = str(row.type).split("|")[0];

  const slots: Record<string, string> = { M: "weapon", R: "range_weapon", S: "shield", LA: "armor", MA: "armor", HA: "armor", RG: "ring" };

  const slot = slots[type] ?? "item";

  const rarity = str(row.rarity);

  const rarities: Record<string, string> = { common: "common", uncommon: "uncommon", rare: "rare", "very rare": "epic", legendary: "legendary" };

  const customType = array(ctx.root.itemType).map(object).find((t) => t.abbreviation === type);

  const consumable = array(row.miscTags).includes("CNS") || CONSUMABLE_TYPES.has(type) || CONSUMABLE_TYPE_NAME.test(str(customType?.name));

  const text = description(row, ctx);

  const hasWeapon = ["M", "R"].includes(type) && typeof row.dmg1 === "string";

  const effects = itemEffects(row, { consumable, potion: type === "P", hasWeapon, text });

  const unique = !consumable && ctx.inputKind !== "baseitem" && UNIQUE_RARITIES.has(rarity);

  const body: Record<string, unknown> = { name: row.name, description: text, slot, item: { unique, ...(consumable && { consumable: true }), ...(row.reqAttune !== undefined && !consumable && { attunement: row.reqAttune !== false }) } };

  if (rarities[rarity]) body.rarity = rarities[rarity];

  if (hasWeapon) body.weapon = { damageDice: row.dmg1, damageType: DAMAGE[str(row.dmgType)] ?? str(row.dmgType), attackType: type === "M" ? "melee" : "ranged", ...(typeof row.dmg2 === "string" && { versatileDice: row.dmg2 }), ...effects.weapon };

  if (["LA", "MA", "HA"].includes(type) && num(row.ac) !== undefined) body.armor = { category: { LA: "light", MA: "medium", HA: "heavy" }[type], base: row.ac, ...(type === "MA" && { dexCap: 2 }), ...(type === "HA" && { dexCap: 0 }) };

  if (effects.abilities.length > 0) body.abilities = effects.abilities;

  const manual = [...new Set([...effects.manual, ...Object.keys(row).filter((f) => OTHER_EFFECT_FIELDS.test(f) && !EFFECT_FIELDS.includes(f as never))])];

  for (const field of manual) ctx.issues.push(issue("MANUAL_ITEM_EFFECT", `${ctx.path}.${field}`, "warning"));

  const notes = [unsupported(row, ["type", "rarity", "dmg1", "dmg2", "dmgType", "ac", "reqAttune", "miscTags", "wondrous", ...EFFECT_FIELDS, ...Object.keys(row).filter((f) => OTHER_EFFECT_FIELDS.test(f))], ctx), ...manual.map((f) => `${f}: ${stableJson(row[f])}`)].filter(Boolean).join("\n");

  return { kind: "artifacts", body, notes };
};

export const materialPage: Adapter = (row, ctx) => {
  const rendered = renderEntries(row.entries ?? row, ctx.path);

  ctx.issues.push(...rendered.issues);

  const text = rendered.text;

  const id = nestedId(ctx.key);

  const content: ScenarioContent = { legend: [], sections: [{ id, title: str(row.name) || "Матеріали", played: false, rows: [{ id: `${id}-row`, story: { type: "doc", content: [] }, notes: { type: "doc", content: text ? [{ type: "paragraph", content: [{ type: "text", text }] }] : [] } }] }] };

  return { kind: "scenarioPages", body: { kind: "note", status: "draft", characterId: null, title: row.name, content, searchText: buildSearchText(str(row.name), content), version: 0 }, notes: "" };
};
