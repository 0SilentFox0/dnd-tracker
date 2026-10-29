/* eslint-disable no-restricted-syntax -- derived content written to the DB stays Ukrainian (spec part5, decision 5) */
import { nestedId, stableJson } from "../identity";
import { type AdapterContext, type CompendiumRef, issue } from "../types";
import { ABILITIES, array, num, object, str, uidRef } from "./shared";

import { ABILITY_LABELS, type AbilityKey } from "@/lib/constants/abilities";
import { CHOICE_LIMITS } from "@/lib/constants/choices";
import { schoolByCode } from "@/lib/constants/spell-groups";
import type { Ability, Effect } from "@/lib/utils/abilities/schema";
import { isRecord } from "@/lib/utils/common/is-record";

const SIZES: Record<string, string> = { F: "крихітний", D: "дрібний", T: "крихітний", S: "малий", M: "середній", L: "великий", H: "величезний", G: "гігантський" };

const SENSES = ["darkvision", "blindsight", "tremorsense", "truesight"] as const;

const SENSE_LABELS: Record<(typeof SENSES)[number], string> = { darkvision: "Темний зір", blindsight: "Сліпий зір", tremorsense: "Чуття вібрацій", truesight: "Істинний зір" };

const MOVEMENTS = [["swim", "плавання"], ["fly", "політ"], ["climb", "лазіння"], ["burrow", "риття"]] as const;

const BASE_SPEED = 30;

const passive = (id: string, name: string, effects: Effect[]): Ability => ({ id, name, trigger: { event: "passive" }, effects });

/** Passive flat resistance effects for plain damage-type strings; `complete` is false when the list has choices or other shapes. */
export function resistFlags(raw: unknown): { effects: Effect[]; complete: boolean } {
  const list = array(raw);

  const types = list.map(str).filter(Boolean);

  return { effects: [...new Set(types)].map((t) => ({ kind: "flag", flag: "resistance", damageType: t.toLowerCase(), percent: 50 }) as Effect), complete: types.length > 0 && types.length === list.length };
}

const titled = (v: string) => v.split("|")[0].replace(/([a-z])([A-Z])/g, "$1 $2").trim();

/** 5etools proficiency rows ({ key: true | n }) as readable text; "any…" and "choose" keys read as a choice. */
export function proficiencyText(raw: unknown): { text: string; choice: boolean } {
  const parts: string[] = [];

  let choice = false;

  for (const row of array(raw)) {
    for (const [key, value] of Object.entries(object(row))) {
      if (key === "choose") {
        choice = true;
        parts.push(`вибір ${num(object(value).count) ?? 1} з: ${array(object(value).from).map((v) => titled(str(v))).join(", ")}`);
      } else if (/^any/.test(key)) {
        choice = true;
        parts.push(`${titled(key.replace(/^any/, "any "))} (вибір: ${num(value) ?? 1})`);
      } else if (value === true) parts.push(titled(key));
      else parts.push(`${titled(key)} ×${num(value) ?? 1}`);
    }
  }

  return { text: parts.join(", "), choice };
}

const feet = (v: number) => `${v} фт.`;

export interface Traits { head: string[]; abilities: Ability[] }

function speedTraits(speedRaw: unknown, ctx: AdapterContext): { text: string; abilities: Ability[] } {
  const speed = object(speedRaw);

  const walk = num(speedRaw) ?? num(speed.walk);

  const parts = walk !== undefined ? [`ходьба ${feet(walk)}`] : [];

  const abilities: Ability[] = [];

  if (walk !== undefined && walk !== BASE_SPEED) abilities.push(passive("race-speed", "Швидкість", [{ kind: "modifyStat", stat: "speed", flat: walk - BASE_SPEED }]));

  const other: string[] = [];

  for (const [key, label] of MOVEMENTS) {
    const value = speed[key];

    const number = value === true ? walk : num(value) ?? num(object(value).number);

    if (number !== undefined) {
      parts.push(`${label} ${feet(number)}`);
      other.push(label);
    }
  }

  if (other.length > 0) ctx.issues.push(issue("MANUAL_RACE_MOVEMENT", `${ctx.path}.speed`, "warning", { movement: other.join(", ") }));

  return { text: parts.join(", "), abilities };
}

/** Size, speed, senses, languages and resistances shared by races and subraces: text head plus passive abilities the engine can read. */
export function raceTraits(row: Record<string, unknown>, ctx: AdapterContext): Traits {
  const head: string[] = [];

  const abilities: Ability[] = [];

  const sizes = array(row.size).map((s) => SIZES[str(s)]).filter(Boolean);

  if (sizes.length > 0) head.push(`Розмір: ${sizes.join(" або ")}`);

  const speed = speedTraits(row.speed, ctx);

  if (speed.text) head.push(`Швидкість: ${speed.text}`);

  abilities.push(...speed.abilities);

  for (const sense of SENSES) {
    const range = num(row[sense]);

    if (range !== undefined && range >= 5) {
      head.push(`${SENSE_LABELS[sense]}: ${feet(range)}`);
      abilities.push(passive(`race-${sense}`, SENSE_LABELS[sense], [{ kind: "flag", flag: "sense", sense, range }]));
    }
  }

  const languages = proficiencyText(row.languageProficiencies).text;

  if (languages) head.push(`Мови: ${languages}`);

  if (ageText(row.age)) head.push(ageText(row.age));

  if (row.resist !== undefined) {
    const resist = resistFlags(row.resist);

    if (resist.effects.length > 0) abilities.push(passive("race-resist", "Опір шкоді", resist.effects));

    if (!resist.complete) ctx.issues.push(issue("MANUAL_RACE_RESIST", `${ctx.path}.resist`, "warning"));
  }

  return { head, abilities };
}

/** Fixed ability bonuses as passive modifyStat (for options that cannot carry an abilityScore choice). */
export function fixedAbilityBonuses(raw: unknown, ctx: AdapterContext): Ability[] {
  const variants = array(raw);

  if (variants.length === 0) return [];

  const row = object(variants[0]);

  const fixed = Object.entries(row).filter(([k, v]) => ABILITIES[k] && typeof v === "number" && Number.isInteger(v) && v !== 0);

  if (variants.length === 1 && fixed.length > 0 && fixed.length === Object.keys(row).length) return [passive("race-asi", "Бонуси характеристик", fixed.map(([k, v]) => ({ kind: "modifyStat", stat: ABILITIES[k] as AbilityKey, flat: v as number }) as Effect))];

  ctx.issues.push(issue("MANUAL_ABILITY_RULE", `${ctx.path}.ability`));

  return [];
}

const COIN = [[100, "зм"], [10, "см"], [1, "мм"]] as const;

const money = (cp: number) => {
  const [unit, name] = COIN.find(([u]) => cp % u === 0) ?? COIN[2];

  return `${cp / unit} ${name}`;
};

function equipmentItem(v: unknown): string {
  if (typeof v === "string") return titled(v);

  const row = object(v);

  const qty = num(row.quantity);

  const suffix = qty && qty > 1 ? ` ×${qty}` : "";

  if (num(row.value) !== undefined) return money(row.value as number);

  const name = str(row.displayName) || str(row.special) || (typeof row.item === "string" ? titled(row.item) : "") || (typeof row.equipmentType === "string" ? `будь-яка: ${titled(row.equipmentType)}` : "");

  return name ? `${name}${suffix}` : stableJson(v);
}

/** Starting equipment sets: "_" is always given, other keys (a, b…) are alternatives. */
export function equipmentText(raw: unknown): string {
  const lines = array(raw).map((set) => {
    const entries = Object.entries(object(set));

    const fixed = entries.filter(([k]) => k === "_").flatMap(([, v]) => array(v).map(equipmentItem));

    const options = entries.filter(([k]) => k !== "_").map(([k, v]) => `${k}) ${array(v).map(equipmentItem).join(", ")}`);

    return [fixed.join(", "), options.length > 0 ? `на вибір: ${options.join("; ")}` : ""].filter(Boolean).join("; ");
  });

  return lines.filter(Boolean).join("\n");
}

export function featPrerequisite(raw: unknown, ctx: AdapterContext): { level?: number; scores?: { abilities: AbilityKey[]; min: number }; text?: string; manualText: string[] } {
  const alternatives = array(raw).map(object);

  const manualText: string[] = [];

  if (alternatives.length === 0) return { manualText };

  const [only] = alternatives;

  if (alternatives.length > 1) {
    manualText.push(...alternatives.map((a) => stableJson(a)));
    ctx.issues.push(issue("MANUAL_PREREQUISITE", `${ctx.path}.prerequisite`, "warning", { variant: "alternatives" }));

    return { manualText };
  }

  const out: ReturnType<typeof featPrerequisite> = { manualText };

  const level = num(only.level) ?? num(object(only.level).level);

  if (level !== undefined && Number.isInteger(level) && level >= 1 && level <= 20 && !object(only.level).class && !object(only.level).subclass) out.level = level;

  const abilityRows = array(only.ability).map(object);

  const picked = abilityRows.flatMap((r) => Object.entries(r).filter(([k, v]) => ABILITIES[k] && typeof v === "number") as Array<[string, number]>);

  const single = abilityRows.length > 0 && abilityRows.every((r) => Object.keys(r).length === 1) && picked.length === abilityRows.length && new Set(picked.map(([, v]) => v)).size === 1;

  if (single) out.scores = { abilities: picked.map(([k]) => ABILITIES[k] as AbilityKey), min: picked[0][1] };

  const unhandled = Object.entries(only).filter(([k]) => !(k === "level" && out.level !== undefined) && !(k === "ability" && out.scores) && !(k === "other"));

  const others = array(only.other).length > 0 ? array(only.other).map(str) : typeof only.other === "string" ? [only.other] : [];

  manualText.push(...others.filter(Boolean), ...unhandled.map(([k, v]) => `${k}: ${stableJson(v)}`));

  const bits = [out.level ? `рівень ${out.level}+` : "", out.scores ? `${out.scores.abilities.map((a) => ABILITY_LABELS[a]).join(" або ")} ${out.scores.min}+` : ""].filter(Boolean);

  if (bits.length > 0) out.text = bits.join(", ");

  if (manualText.length > 0) ctx.issues.push(issue("MANUAL_PREREQUISITE", `${ctx.path}.prerequisite`, "warning"));

  return out;
}

interface SpellChoice { id: string; label: string; description?: string; level: number; count: number; kind: "option" | "spell"; options?: Array<Record<string, unknown>>; spells?: { lists: string[]; minLevel: number; maxLevel: number }; grant?: Record<string, unknown> }

type Grant = { uses: number; rest: "short" | "long"; dcAbility?: AbilityKey } | undefined;

export interface FeatSpells { choices: SpellChoice[]; refs: CompendiumRef[]; manual: unknown[] }

const FILTER_KEYS = new Set(["level"]);

function parseFilter(filter: string): { level?: number; extra: string[] } {
  const parts = filter.split("|").map((p) => p.split("="));

  const level = parts.find(([k]) => k === "level")?.[1];

  const extra = parts.filter(([k]) => !FILTER_KEYS.has(k)).map(([k, v]) => (k === "school" ? `школи: ${(v ?? "").split(";").map((c) => schoolByCode(c)?.name ?? c).join(", ")}` : `${k}: ${v ?? ""}`));

  return { level: level !== undefined && /^\d+$/.test(level) ? Number(level) : undefined, extra };
}

/** additionalSpells → option/spell choices with grant policies; at-will leveled spells, expanded lists and schools filters are returned as `manual`/described. */
export function featSpells(raw: unknown, ctx: AdapterContext, offset: number): FeatSpells {
  const out: FeatSpells = { choices: [], refs: [], manual: [] };

  const index = () => offset + out.choices.length;

  const optionsFor = (uids: string[], level: number, grant: Grant, choiceIndex: number) =>
    uids.map((uid, j) => {
      const [name] = uid.split("|");

      const clean = uid.split("#")[0];

      out.refs.push(uidRef(clean, "spell", ["choices", choiceIndex, "options", j, "spells", 0, "spellId"], ctx));

      return { id: nestedId(clean), name: name.replace(/^./, (c) => c.toUpperCase()), abilities: [], spells: [{ level, spellId: clean.split("|")[0], ...(grant && { grant }) }] };
    });

  const addNamed = (label: string, uids: string[], count: number, level: number, grant: Grant) => {
    if (uids.length === 0) return;

    const at = index();

    out.choices.push({ id: `import-spells-${at}`, label, level: 1, count: Math.min(count, uids.length, CHOICE_LIMITS.count), kind: "option", options: optionsFor(uids, level, grant, at) });
  };

  const addFilter = (filter: string, level: number, grant: Grant) => {
    const parsed = parseFilter(filter);

    if (parsed.level === undefined) {
      out.manual.push({ choose: filter });

      return;
    }

    const at = index();

    out.choices.push({ id: `import-spells-${at}`, label: `Заклинання ${parsed.level}-го кола`, ...(parsed.extra.length > 0 && { description: `Обмеження за описом риси (${parsed.extra.join("; ")}) рушій не перевіряє` }), level: 1, count: 1, kind: "spell", spells: { lists: [], minLevel: parsed.level, maxLevel: parsed.level }, ...(grant && { grant }) });

    if (parsed.extra.length > 0) out.manual.push({ choose: filter, unchecked: parsed.extra });
  };

  const group = (entries: unknown[], label: string, level: number, grant: Grant, opts: { shared?: boolean; atWill?: boolean }) => {
    const named = entries.filter((e): e is string => typeof e === "string");

    const pickCount = opts.shared ? 1 : named.length;

    for (const e of entries) {
      if (typeof e === "string") continue;

      const choose = object(e).choose;

      if (typeof choose === "string") addFilter(choose, level, grant);
      else if (Array.isArray(object(choose).from)) addNamed(label, array(object(choose).from).map(str).filter(Boolean), num(object(choose).count) ?? 1, level, grant);
      else out.manual.push(e);
    }

    const cantrips = named.filter((n) => n.includes("#c"));

    if (opts.atWill && cantrips.length !== named.length) {
      out.manual.push({ atWill: named.filter((n) => !n.includes("#c")) });
      addNamed(label, cantrips, cantrips.length, level, undefined);

      return;
    }

    addNamed(label, named, pickCount, level, grant);
  };

  for (const [i, blockRaw] of array(raw).entries()) {
    const block = object(blockRaw);

    const dc = typeof block.ability === "string" ? (ABILITIES[block.ability] as AbilityKey | undefined) : undefined;

    const withDc = (g: { uses: number; rest: "short" | "long" }): Grant => ({ ...g, ...(dc && { dcAbility: dc }) });

    const handled = new Set(["ability", "innate", "known", "prepared"]);

    for (const key of Object.keys(block)) if (!handled.has(key)) out.manual.push({ [key]: block[key] });

    for (const mode of ["known", "prepared"] as const) {
      for (const [levelKey, value] of Object.entries(object(block[mode]))) {
        const level = /^\d+$/.test(levelKey) ? Number(levelKey) : 1;

        if (Array.isArray(value)) group(value, `Заклинання (блок ${i + 1})`, level, undefined, {});
        else out.manual.push({ [mode]: { [levelKey]: value } });
      }
    }

    for (const [levelKey, byUse] of Object.entries(object(block.innate))) {
      const level = /^\d+$/.test(levelKey) ? Number(levelKey) : 1;

      if (!isRecord(byUse)) {
        out.manual.push({ innate: { [levelKey]: byUse } });
        continue;
      }

      for (const [useKey, value] of Object.entries(byUse)) {
        if (useKey === "will" && Array.isArray(value)) {
          group(value, "Заклинання без обмежень", level, undefined, { atWill: true });
        } else if ((useKey === "daily" || useKey === "rest") && value && typeof value === "object") {
          for (const [countKey, list] of Object.entries(object(value))) {
            const m = /^(\d+)(e?)$/.exec(countKey);

            if (!m || !Array.isArray(list)) {
              out.manual.push({ [useKey]: { [countKey]: list } });
              continue;
            }

            const uses = Number(m[1]);

            if (uses < 1 || uses > CHOICE_LIMITS.grantUses) {
              out.manual.push({ [useKey]: { [countKey]: list } });
              continue;
            }

            group(list, `Заклинання ${useKey === "daily" ? "раз на день" : "раз на відпочинок"}`, level, withDc({ uses, rest: useKey === "daily" ? "long" : "short" }), { shared: m[2] !== "e" });
          }
        } else out.manual.push({ innate: { [levelKey]: { [useKey]: value } } });
      }
    }
  }

  return out;
}

/** Subrace/lineage option spells: only fixed spells fit an option, so pick-one groups and filters stay manual. */
export function lineageSpells(raw: unknown, ctx: AdapterContext): { spells: Array<Record<string, unknown>>; refs: CompendiumRef[]; manual: unknown[] } {
  const built = featSpells(raw, ctx, 0);

  const spells: Array<Record<string, unknown>> = [];

  const refs: CompendiumRef[] = [];

  const manual = [...built.manual];

  let cursor = 0;

  for (const choice of built.choices) {
    const options = choice.options ?? [];

    if (choice.kind === "option" && choice.count === options.length && spells.length + options.length <= CHOICE_LIMITS.optionSpells) {
      for (const o of options) {
        refs.push({ ...built.refs[cursor++], path: ["choices", 0, "options", 0, "spells", spells.length, "spellId"] });
        spells.push((o.spells as Array<Record<string, unknown>>)[0]);
      }
    } else {
      cursor += options.length;
      manual.push({ unsupportedGroup: choice.label });
    }
  }

  return { spells, refs, manual };
}

export function ageText(raw: unknown): string {
  const age = object(raw);

  const parts = [num(age.mature) !== undefined ? `дорослість з ${age.mature}` : "", num(age.max) !== undefined ? `живе до ${age.max}` : ""].filter(Boolean);

  return parts.length > 0 ? `Вік: ${parts.join(", ")}` : "";
}
