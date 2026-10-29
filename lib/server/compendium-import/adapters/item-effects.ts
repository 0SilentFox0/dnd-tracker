import { resistFlags } from "./character-traits";
import { num } from "./shared";

import type { Translator } from "@/lib/i18n/translator";
import type { Ability, Effect } from "@/lib/utils/abilities/schema";

const SIGNED = /^([+-]\d+)$/;

const ROUNDS: Record<string, number> = { round: 1, minute: 10, hour: 600, day: 14400 };

const DURATION = /\b(?:for|lasts?(?: for)?)\s+(?:the\s+)?(?:next\s+)?(\d+|an?|one)?\s*(round|minute|hour|day)s?\b/i;

const MAX_ROUNDS = 99;

export const EFFECT_FIELDS = ["bonusWeapon", "bonusWeaponAttack", "bonusWeaponDamage", "bonusAc", "bonusSavingThrow", "resist"] as const;

export interface ItemEffects {
  abilities: Ability[];
  weapon: { attackBonus?: number; damageBonus?: number };
  manual: string[];
}

const signed = (v: unknown): number | undefined => (typeof v === "string" && SIGNED.test(v.trim()) ? Number(v.trim()) : num(v));

export function durationRounds(text: string): number | undefined {
  const m = DURATION.exec(text);

  if (!m) return undefined;

  const count = m[1] && /^\d+$/.test(m[1]) ? Number(m[1]) : 1;

  return Math.min(MAX_ROUNDS, Math.max(1, count * ROUNDS[m[2].toLowerCase()]));
}

/** +N bonuses and damage resistances become passive abilities (equipped item) or a timed drink/use ability (consumable); the rest is reported by field name. */
export function itemEffects(row: Record<string, unknown>, opts: { consumable: boolean; potion: boolean; hasWeapon: boolean; text: string }, t: Translator): ItemEffects {
  const effects: Effect[] = [];

  const weapon: ItemEffects["weapon"] = {};

  const manual: string[] = [];

  const flat = (field: string, stat: "armor" | "savingThrow") => {
    const value = signed(row[field]);

    if (value === undefined) manual.push(field);
    else effects.push({ kind: "modifyStat", stat, flat: value });
  };

  if (row.bonusAc !== undefined) flat("bonusAc", "armor");

  if (row.bonusSavingThrow !== undefined) flat("bonusSavingThrow", "savingThrow");

  for (const [field, keys] of [["bonusWeapon", ["attackBonus", "damageBonus"]], ["bonusWeaponAttack", ["attackBonus"]], ["bonusWeaponDamage", ["damageBonus"]]] as const) {
    if (row[field] === undefined) continue;

    const value = signed(row[field]);

    if (value === undefined || !opts.hasWeapon || opts.consumable) manual.push(field);
    else for (const key of keys) weapon[key] = value;
  }

  if (row.resist !== undefined) {
    const resist = resistFlags(row.resist);

    if (!resist.complete) manual.push("resist");

    effects.push(...resist.effects);
  }

  const rounds = opts.consumable && effects.length > 0 ? durationRounds(opts.text) : undefined;

  if (opts.consumable) {
    if (effects.length > 0 && rounds === undefined) {
      manual.push(...EFFECT_FIELDS.filter((f) => row[f] !== undefined && !manual.includes(f)));

      effects.length = 0;
    }

    const timed = effects.map((e) => ({ ...e, duration: { rounds: rounds as number } }) as Effect);

    return { abilities: [consumableAbility(opts.potion, timed, t)], weapon, manual };
  }

  return { abilities: effects.length > 0 ? [{ id: "bonuses", name: t("derived.trait.itemBonuses"), trigger: { event: "passive" }, effects }] : [], weapon, manual };
}

function consumableAbility(potion: boolean, effects: Effect[], t: Translator): Ability {
  return {
    id: potion ? "drink" : "use",
    name: t(potion ? "derived.item.drink" : "derived.item.use"),
    trigger: { event: potion ? "bonusAction" : "action" },
    limits: { pool: { key: "charges", cost: 1 } },
    effects: effects.length > 0 ? effects : [{ kind: "note", text: t(potion ? "derived.item.drinkPotion" : "derived.item.useItem") }],
  };
}

