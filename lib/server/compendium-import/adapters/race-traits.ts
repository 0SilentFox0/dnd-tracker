/* eslint-disable no-restricted-syntax -- derived content written to the DB stays Ukrainian (spec part5, decision 5) */
import { type AdapterContext, issue } from "../types";
import { ABILITIES, array, num, object, str, titled } from "./shared";

import type { AbilityKey } from "@/lib/constants/abilities";
import type { Ability, Effect } from "@/lib/utils/abilities/schema";

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

export function ageText(raw: unknown): string {
  const age = object(raw);

  const parts = [num(age.mature) !== undefined ? `дорослість з ${age.mature}` : "", num(age.max) !== undefined ? `живе до ${age.max}` : ""].filter(Boolean);

  return parts.length > 0 ? `Вік: ${parts.join(", ")}` : "";
}
