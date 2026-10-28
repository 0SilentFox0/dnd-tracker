import type { TimedEffectInput } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { type Condition5eKey } from "@/lib/utils/abilities/schema/kinds";
import type { ActiveEffect } from "@/types/battle";

export { CONDITION_5E_KEYS, type Condition5eKey } from "@/lib/utils/abilities/schema/kinds";

export type ExhaustionVariant = "2014" | "2024";

interface Condition5eDef {
  label: string;
  description: string;
  markers: string[];
  flags: (variant: ExhaustionVariant) => StaticEffect[];
  implies?: Condition5eKey[];
}

const flag = (f: Record<string, unknown>) => ({ kind: "flag", ...f }) as StaticEffect;

const STR_DEX = ["strength", "dexterity"];

const INCAPACITATED_MARKERS = ["skip_action", "no_bonus_action", "no_reaction"];

export const CONDITION_5E_REGISTRY = {
  blinded: {
    label: "Засліплений",
    description: "Не бачить: атаки з недоліком, атаки по ньому з перевагою.",
    markers: [],
    flags: () => [flag({ flag: "disadvantage" }), flag({ flag: "advantageForAttackers" })],
  },
  charmed: {
    label: "Зачарований",
    description: "Не може атакувати зачаровувача; зачаровувач має перевагу в соціальних перевірках (рушій перевіряє джерело стану).",
    markers: [],
    flags: () => [],
  },
  deafened: { label: "Оглухлий", description: "Нічого не чує; без механічного впливу в бою.", markers: [], flags: () => [] },
  frightened: {
    label: "Наляканий",
    description: "Недолік на атаки, поки джерело страху в полі зору (рушій перевіряє джерело стану).",
    markers: [],
    flags: () => [],
  },
  grappled: {
    label: "Схоплений",
    description: "Швидкість 0. За правилами 2024 — недолік на атаки по всіх, крім того, хто схопив (виняток для схоплювача не моделюється).",
    markers: ["immobilized"],
    flags: (v) => (v === "2024" ? [flag({ flag: "disadvantage" })] : []),
  },
  incapacitated: { label: "Недієздатний", description: "Не може діяти й реагувати; концентрація переривається.", markers: INCAPACITATED_MARKERS, flags: () => [] },
  invisible: {
    label: "Невидимий",
    description: "Атаки з перевагою, атаки по ньому з недоліком.",
    markers: [],
    flags: () => [flag({ flag: "advantage", attackKind: "all" }), flag({ flag: "disadvantageForAttackers" })],
  },
  paralyzed: {
    label: "Паралізований",
    description: "Недієздатний і не рухається; автопровал СИЛ/СПР; атаки по ньому з перевагою, ближні з 5 фт — критичні.",
    markers: ["immobilized"],
    implies: ["incapacitated"],
    flags: () => [flag({ flag: "autoFailSave", abilities: STR_DEX }), flag({ flag: "advantageForAttackers" }), flag({ flag: "autoCritAdjacent" })],
  },
  petrified: {
    label: "Скам'янілий",
    description: "Недієздатний, не рухається; автопровал СИЛ/СПР; опір усій шкоді; імунітет до отруєння.",
    markers: ["immobilized"],
    implies: ["incapacitated"],
    flags: () => [
      flag({ flag: "autoFailSave", abilities: STR_DEX }),
      flag({ flag: "advantageForAttackers" }),
      flag({ flag: "resistance", damageType: "all", percent: 50 }),
      flag({ flag: "conditionImmunity", conditions: ["poisoned"] }),
    ],
  },
  poisoned: { label: "Отруєний", description: "Недолік на атаки.", markers: [], flags: () => [flag({ flag: "disadvantage" })] },
  prone: {
    label: "Повалений",
    description: "Недолік на власні атаки; ближні атаки по ньому з перевагою, дальні — з недоліком.",
    markers: [],
    flags: () => [flag({ flag: "disadvantage" }), flag({ flag: "proneDefense" })],
  },
  restrained: {
    label: "Скутий",
    description: "Швидкість 0; недолік на атаки і рятівні кидки СПР; атаки по ньому з перевагою.",
    markers: ["immobilized"],
    flags: () => [flag({ flag: "disadvantage" }), flag({ flag: "advantageForAttackers" }), flag({ flag: "saveDisadvantage", abilities: ["dexterity"] })],
  },
  stunned: {
    label: "Приголомшений",
    description: "Недієздатний, не рухається; автопровал СИЛ/СПР; атаки по ньому з перевагою.",
    markers: ["immobilized"],
    implies: ["incapacitated"],
    flags: () => [flag({ flag: "autoFailSave", abilities: STR_DEX }), flag({ flag: "advantageForAttackers" })],
  },
  unconscious: {
    label: "Непритомний",
    description: "Недієздатний, не рухається, повалений; автопровал СИЛ/СПР; атаки по ньому з перевагою, ближні з 5 фт — критичні.",
    markers: ["immobilized"],
    implies: ["incapacitated", "prone"],
    flags: () => [flag({ flag: "autoFailSave", abilities: STR_DEX }), flag({ flag: "advantageForAttackers" }), flag({ flag: "autoCritAdjacent" })],
  },
  exhaustion: {
    label: "Виснаження",
    description: "Накопичується рівнями 1–6; ефекти залежать від варіанта правил (2014 / 2024); 6 рівень — смерть.",
    markers: [],
    flags: () => [],
  },
} satisfies Record<Condition5eKey, Condition5eDef>;

export function exhaustionEffects(level: number, variant: ExhaustionVariant): StaticEffect[] {
  if (level < 1) return [];

  if (variant === "2024") {
    return [
      { kind: "modifyStat", stat: "attackBonus", flat: -2 * level },
      { kind: "modifyStat", stat: "savingThrow", flat: -2 * level },
      { kind: "modifyStat", stat: "speed", flat: -5 * level },
    ];
  }

  const effects: StaticEffect[] = [];

  if (level >= 2) effects.push({ kind: "modifyStat", stat: "speed", percent: level >= 5 ? -100 : -50 });

  if (level >= 3) effects.push(flag({ flag: "disadvantage" }), flag({ flag: "saveDisadvantage", abilities: "all" }));

  return effects;
}

function closure(key: Condition5eKey, seen: Condition5eKey[] = []): Condition5eKey[] {
  if (seen.includes(key)) return seen;

  const def: Condition5eDef = CONDITION_5E_REGISTRY[key];

  return (def.implies ?? []).reduce((acc, k) => closure(k, acc), [...seen, key]);
}

export function expandCondition5e(key: Condition5eKey, opts: { exhaustion: ExhaustionVariant; level?: number }): { markers: ActiveEffect["effects"]; flags: StaticEffect[] } {
  const markers: ActiveEffect["effects"] = [];

  const flags: StaticEffect[] = [];

  const seenFlags = new Set<string>();

  const addMarker = (type: string, value: number) => {
    if (!markers.some((m) => m.type === type)) markers.push({ type, value });
  };

  for (const k of closure(key)) {
    const def: Condition5eDef = CONDITION_5E_REGISTRY[k];

    addMarker(k, k === "exhaustion" ? (opts.level ?? 1) : 1);

    for (const m of def.markers) addMarker(m, m === "skip_action" ? 100 : 1);

    for (const f of k === "exhaustion" ? exhaustionEffects(opts.level ?? 1, opts.exhaustion) : def.flags(opts.exhaustion)) {
      const sig = JSON.stringify(f);

      if (!seenFlags.has(sig)) {
        seenFlags.add(sig);
        flags.push(f);
      }
    }
  }

  return { markers, flags };
}

export const PERMANENT_ROUNDS = 99;

export interface ConditionEffectOptions {
  timedKey: string;
  rounds: number;
  exhaustion: ExhaustionVariant;
  permanent?: boolean;
  levels?: number;
  saveEnds?: ActiveEffect["saveEnds"];
  source?: ActiveEffect["source"];
}

export function conditionEffectInput(key: Condition5eKey, opts: ConditionEffectOptions): TimedEffectInput {
  const isExhaustion = key === "exhaustion";

  const { markers, flags } = expandCondition5e(key, { exhaustion: opts.exhaustion, level: isExhaustion ? (opts.levels ?? 1) : undefined });

  return {
    timedKey: opts.timedKey,
    source: opts.source,
    name: CONDITION_5E_REGISTRY[key].label,
    type: "condition",
    rounds: opts.rounds,
    stackable: isExhaustion,
    effects: markers,
    abilityEffects: flags.length ? flags : undefined,
    permanent: opts.permanent,
    saveEnds: opts.saveEnds,
    exhaustionVariant: isExhaustion ? opts.exhaustion : undefined,
  };
}
