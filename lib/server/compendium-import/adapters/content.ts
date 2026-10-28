import { renderEntries } from "../entries";
import { nestedId, stableJson } from "../identity";
import { type Adapter, issue } from "../types";
import { type MonsterStats, parseAttack, parseMultiattack, plainName } from "./monster-attacks";
import { CastingBuilder, defenseAbilities, legendaryAbilities, legendaryResistances, saveProficiencies } from "./monster-traits";
import { ABILITIES, array, description, num, object, str, unsupported } from "./shared";

import type { AbilityKey } from "@/lib/constants/abilities";
import type { Ability } from "@/lib/utils/abilities/schema";
import { buildSearchText } from "@/lib/utils/scenario/search-text";
import type { ScenarioContent } from "@/types/scenario";

export const spell: Adapter = (row, ctx) => {
  ctx.issues.push(issue("MANUAL_SPELL", ctx.path, "warning", "Налаштуйте механіку заклинання або застосовуйте його вручну"));

  return { kind: "spells", body: { name: row.name, level: row.level, description: description(row, ctx), executionMode: "manual", cost: "action", targeting: { kind: "self" }, resolution: { kind: "auto" }, dice: 0, spellEffects: [], concentration: array(row.duration).some((d) => object(d).concentration === true), lists: array(object(row.classes).fromClassList).map((r) => str(object(r).name)).filter(Boolean) }, notes: unsupported(row, ["level", "school", "classes"], ctx) };
};

const MONSTER_FIELDS = ["trait", "action", "bonus", "reaction", "legendary", "spellcasting"] as const;

const renderRaw = (entries: unknown[]): string => entries.map((e) => (typeof e === "string" ? e : "")).join(" ");

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

  const complete = Object.values(scores).every((v) => v !== undefined);

  const stats: MonsterStats = { scores: complete ? (scores as Record<AbilityKey, number>) : null, cr: cr !== null && Number.isFinite(cr) ? cr : null };

  const casting = new CastingBuilder(ctx.edition);

  const manual = (field: string, index: number, name: string) => ctx.issues.push(issue("MANUAL_MONSTER_ACTION", `${ctx.path}.${field}[${index}]`, "warning", `Дію «${name}» не автоматизовано: використайте текст або налаштуйте механіку вручну`));

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

      if (field === "trait" && /^Legendary Resistance \(\d+\/Day/i.test(name)) {
        resistances = legendaryResistances([item]);
        continue;
      }

      if (field === "action") {
        const multi = parseMultiattack({ name, entries });

        if (multi) {
          multiattack = multi.count;
          keep(field, item);

          if (multi.complex) ctx.issues.push(issue("MANUAL_MULTIATTACK_DETAIL", `${ctx.path}.action[${index}]`, "warning", "Рушій зберігає лише кількість атак за дію; склад і альтернативи Multiattack лишилися в тексті"));

          continue;
        }

        const parsed = parseAttack({ name: str(entry.name), entries }, stats);

        if (parsed) {
          attacks.push(parsed.row);

          if (parsed.rider) ctx.issues.push(issue("MANUAL_ATTACK_RIDER", `${ctx.path}.action[${index}]`, "warning", `Додатковий ефект атаки «${name}» (збереження, стан тощо) збережено текстом у властивостях атаки`));

          if (parsed.mixedDamage) ctx.issues.push(issue("MONSTER_ATTACK_MIXED_DAMAGE", `${ctx.path}.action[${index}]`, "warning", `Атака «${name}» має кілька типів шкоди: сумарні кістки застосовано до першого типу`));

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

  for (const text of defenses.unresolved) ctx.issues.push(issue("MANUAL_MONSTER_DEFENSE", `${ctx.path}.defenses`, "warning", `Захист «${text}» не автоматизовано: налаштуйте вручну`));

  if (defenses.nonMagicalApprox) ctx.issues.push(issue("MONSTER_NONMAGICAL_APPROX", `${ctx.path}.defenses`, "warning", "Рушій не розрізняє магічну й немагічну зброю: опір/імунітет «від немагічних атак» застосовано до всієї фізичної шкоди"));

  const legendary = legendaryAbilities(row.legendary, attacks.map((a) => String(a.name)));

  abilities.push(...legendary.abilities);

  for (const name of legendary.manual) ctx.issues.push(issue("MANUAL_MONSTER_ACTION", `${ctx.path}.legendary`, "warning", `Легендарну дію «${name}» збережено як нотатку: автоматично виконується лише атака`));

  const built = casting.build();

  if (built?.approximate) ctx.issues.push(issue("MONSTER_SPELL_SLOTS_APPROX", `${ctx.path}.spellcasting`, "warning", "Слоти заклинань монстра не моделюються: ліміт слотів застосовано до кожного заклинання окремо"));

  for (const key of built?.unresolved ?? []) ctx.issues.push(issue("MANUAL_MONSTER_ACTION", `${ctx.path}.${key}`, "warning", "Це обмеження заклинань не автоматизовано"));

  const statblock = { ...(type && { creatureType: type }), ...(sizes[str(array(row.size)[0])] && { size: sizes[str(array(row.size)[0])] }), ...(Array.isArray(row.languages) && { languages: row.languages.map(str).join(", ") }), ...(resistances?.lair !== undefined && { lairResistances: resistances.lair }), movement: Object.fromEntries(["fly", "swim", "climb", "burrow"].filter((s) => num(movement[s]) !== undefined).map((s) => [s, movement[s]])) };

  const notes = [description(row, ctx), ...MONSTER_FIELDS.map((field) => {
    const rendered = renderEntries(unhandled[field] ?? [], `${ctx.path}.${field}`);

    ctx.issues.push(...rendered.issues);

    return rendered.text;
  }), unsupported(row, ["ac", "hp", "cr", "speed", "size", "type", "languages", "save", "resist", "immune", "vulnerable", "conditionImmune", "legendaryActions", ...Object.keys(ABILITIES), ...MONSTER_FIELDS], ctx)].filter(Boolean).join("\n");

  const legendaryCount = num(row.legendaryActions) ?? (legendary.abilities.length > 0 ? 3 : 0);

  return {
    kind: "units",
    refs: built?.refs,
    body: { name: row.name, ...scores, armorClass: ac, maxHp: hp, speed: num(movement.walk) ?? (num(row.speed) ?? 0), gridSize: str(array(row.size)[0]) === "L" ? 2 : ["H", "G"].includes(str(array(row.size)[0])) ? 3 : 1, cr, statblock, attacks, abilities, multiattack, saveProficiencies: saveProficiencies(row.save, stats.scores), legendaryActions: Math.min(5, legendaryCount), legendaryResistances: Math.min(10, resistances?.count ?? 0), ...(built && { spellcasting: built.config }) },
    notes,
  };
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
