import { EffectMarker } from "@/lib/constants/battle";
import { dynamicTextRef } from "@/lib/i18n/text-ref";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { type Condition5eKey, type CustomConditionKey } from "@/lib/utils/abilities/schema/kinds";
import type { LabeledEffectInput } from "@/lib/utils/battle/actions/effects";
import { exhaustionEffects } from "@/lib/utils/battle/conditions/exhaustion";
import type { ConditionEffectOptions, ExhaustionVariant } from "@/lib/utils/battle/conditions/set";
import type { Ruleset } from "@/lib/utils/rules";
import type { ActiveEffect } from "@/types/battle";

interface Condition5eDef {
  markers: string[];
  flags: (variant: ExhaustionVariant) => StaticEffect[];
  implies?: Condition5eKey[];
}

const flag = (f: Record<string, unknown>) => ({ kind: "flag", ...f }) as StaticEffect;

const STR_DEX = ["strength", "dexterity"];

const INCAPACITATED_MARKERS = [EffectMarker.SKIP_ACTION, EffectMarker.NO_BONUS_ACTION, EffectMarker.NO_REACTION];

export const CONDITION_5E_REGISTRY = {
  blinded: {
    markers: [],
    flags: () => [flag({ flag: "disadvantage" }), flag({ flag: "advantageForAttackers" })],
  },
  charmed: {
    markers: [],
    flags: () => [],
  },
  deafened: { markers: [], flags: () => [] },
  frightened: {
    markers: [],
    flags: () => [],
  },
  grappled: {
    markers: [EffectMarker.IMMOBILIZED],
    flags: (v) => (v === "2024" ? [flag({ flag: "disadvantage" })] : []),
  },
  incapacitated: { markers: INCAPACITATED_MARKERS, flags: () => [] },
  invisible: {
    markers: [],
    flags: () => [flag({ flag: "advantage", attackKind: "all" }), flag({ flag: "disadvantageForAttackers" })],
  },
  paralyzed: {
    markers: [EffectMarker.IMMOBILIZED],
    implies: ["incapacitated"],
    flags: () => [flag({ flag: "autoFailSave", abilities: STR_DEX }), flag({ flag: "advantageForAttackers" }), flag({ flag: "autoCritAdjacent" })],
  },
  petrified: {
    markers: [EffectMarker.IMMOBILIZED],
    implies: ["incapacitated"],
    flags: () => [
      flag({ flag: "autoFailSave", abilities: STR_DEX }),
      flag({ flag: "advantageForAttackers" }),
      flag({ flag: "resistance", damageType: "all", percent: 50 }),
      flag({ flag: "conditionImmunity", conditions: ["poisoned"] }),
    ],
  },
  poisoned: { markers: [], flags: () => [flag({ flag: "disadvantage" })] },
  prone: {
    markers: [],
    flags: () => [flag({ flag: "disadvantage" }), flag({ flag: "proneDefense" })],
  },
  restrained: {
    markers: [EffectMarker.IMMOBILIZED],
    flags: () => [flag({ flag: "disadvantage" }), flag({ flag: "advantageForAttackers" }), flag({ flag: "saveDisadvantage", abilities: ["dexterity"] })],
  },
  stunned: {
    markers: [EffectMarker.IMMOBILIZED],
    implies: ["incapacitated"],
    flags: () => [flag({ flag: "autoFailSave", abilities: STR_DEX }), flag({ flag: "advantageForAttackers" })],
  },
  unconscious: {
    markers: [EffectMarker.IMMOBILIZED],
    implies: ["incapacitated", "prone"],
    flags: () => [flag({ flag: "autoFailSave", abilities: STR_DEX }), flag({ flag: "advantageForAttackers" }), flag({ flag: "autoCritAdjacent" })],
  },
  exhaustion: {
    markers: [],
    flags: () => [],
  },
} satisfies Record<Condition5eKey, Condition5eDef>;

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

    for (const m of def.markers) addMarker(m, m === EffectMarker.SKIP_ACTION ? 100 : 1);

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

export function conditionEffectInput(key: Condition5eKey, opts: ConditionEffectOptions): LabeledEffectInput {
  const isExhaustion = key === "exhaustion";

  const { markers, flags } = expandCondition5e(key, { exhaustion: opts.exhaustion, level: isExhaustion ? (opts.levels ?? 1) : undefined });

  return {
    timedKey: opts.timedKey,
    source: opts.source,
    name: key,
    label: dynamicTextRef(`battleCommon.conditions.${key}.label`),
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

export type CustomConditionDef = NonNullable<Ruleset["conditions"]["custom"]>[number];

export function customConditionDef(key: CustomConditionKey, rules: Ruleset): CustomConditionDef | undefined {
  return rules.conditions.custom?.find((c) => c.key === key);
}

export function customConditionInput(def: CustomConditionDef, opts: ConditionEffectOptions): LabeledEffectInput {
  return {
    timedKey: opts.timedKey,
    source: opts.source,
    name: def.name,
    label: def.name,
    type: "condition",
    rounds: opts.rounds,
    stackable: false,
    effects: [def.key, ...def.markers].map((type) => ({ type, value: type === EffectMarker.SKIP_ACTION ? 100 : 1 })),
    abilityEffects: def.abilityEffects?.length ? def.abilityEffects : undefined,
    permanent: opts.permanent,
    saveEnds: opts.saveEnds,
  };
}
