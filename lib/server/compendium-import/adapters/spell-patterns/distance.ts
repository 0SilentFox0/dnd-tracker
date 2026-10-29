/* eslint-disable no-restricted-syntax -- derived content written to the DB stays Ukrainian (spec part5, decision 5) */
import { array } from "../shared";
import type { SpellRecognizer } from "./index";

import type { AbilityKey } from "@/lib/constants/abilities";
import { spellRange } from "@/lib/utils/spells/derive/mechanics";
import type { SpellDefinition, SpellEffect } from "@/lib/utils/spells/model/schema";

const RANGE_ROW = /(\d+)\s*-\s*(\d+) feet:?\s*(\d+d\d+)\b/gi;

const UPCAST = /\bdamage increases by (\d+)d\d+ for each (?:spell )?slot level above/i;

const FALL_DICE = /\b(\d+)d(\d+)\b[^.]*?\bfor (?:every|each) 10 feet\b/i;

const FALL_MAX = /\bmaximum of (\d+)d\d+/i;

const SAVE_HALF = /\bhalf as much damage\b/i;

const damageTypeOf = (types: string[]) => types[0] ?? "magic";

function resolutionOf(row: Record<string, unknown>, ability: string | null, text: string): SpellDefinition["resolution"] | null {
  if (array(row.spellAttack).length > 0) return { kind: "attack" };

  if (ability) return { kind: "save", ability: ability as AbilityKey, onSuccess: SAVE_HALF.test(text) ? "half" : "none" };

  return null;
}

export const byDistanceDamage: SpellRecognizer = ({ row, text, higher, cast, ability, damageTypes }) => {
  const ranges = [...text.matchAll(RANGE_ROW)].map((m) => ({ maxFeet: Number(m[2]), dice: m[3] }));

  if (ranges.length < 2 || ranges.length > 6 || cast.facts.shape_type) return null;

  if (!ranges.every((r, i) => r.maxFeet % 5 === 0 && r.maxFeet <= 600 && (i === 0 || r.maxFeet > ranges[i - 1].maxFeet))) return null;

  const resolution = resolutionOf(row, ability, text);

  if (!resolution) return null;

  const range = spellRange(cast.facts);

  const step = UPCAST.exec(higher);

  return {
    native: {
      narrative: false,
      riders: [],
      fields: {
        targeting: { kind: "enemy", ...(range !== "self" && { range }) },
        resolution,
        dice: 0,
        spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: damageTypeOf(damageTypes), byDistance: ranges }],
        ...(step && { upcastDice: Number(step[1]) }),
      },
    },
  };
};

export const fallingDamage: SpellRecognizer = ({ text, cast, ability, damageTypes }) => {
  const dice = FALL_DICE.exec(text);

  const cap = FALL_MAX.exec(text);

  if (!dice || !cap || !ability) return null;

  const max = Number(cap[1]);

  const sides = Number(dice[2]);

  if (![4, 6, 8, 10, 12, 20].includes(sides) || max < 1 || max > 40) return null;

  const range = spellRange(cast.facts);

  const flying = /\bflying creature\b/i.test(text);

  const prone = /\bprone\b|\bpulled to the ground\b/i.test(text);

  const effects: SpellEffect[] = [
    { kind: "inputDice", label: "Висота, ×10 фт", max },
    { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: damageTypeOf(damageTypes) },
    ...(prone ? [{ kind: "applyCondition" as const, condition: "prone" as const, duration: { rounds: 1 } }] : []),
  ];

  return {
    native: {
      narrative: false,
      riders: [],
      fields: {
        targeting: { kind: "enemy", ...(range !== "self" && { range }), ...(flying && { filter: { movement: "fly" } }) },
        resolution: { kind: "save", ability, onSuccess: "none" },
        dice: 1,
        dieSides: sides,
        fixedDice: true,
        spellEffects: effects,
      },
    },
  };
};

const NEAR_HIT = /\bwithin (\d+) feet of you when you cast[^.]*?\bdealing (\d+)d(\d+)\b[^.]*?\bdamage\b/i;

const FAR_TRAVEL = /\bfarther than (\d+) feet[^.]*?\bat a rate of (\d+) feet per round\b/i;

const UPCAST_NEAR = /\bextra (\d+)d\d+ [^.]*?\bfor each slot level above\b/i;

export const delayedStrike: SpellRecognizer = ({ text, higher, cast, ability, damageTypes }) => {
  const near = NEAR_HIT.exec(text);

  const far = FAR_TRAVEL.exec(text);

  if (!near || !far || near[1] !== far[1] || ability || array(damageTypes).length === 0) return null;

  const feet = Number(near[1]);

  const perRoundFeet = Number(far[2]);

  const sides = Number(near[3]);

  const dice = Number(near[2]);

  const range = spellRange(cast.facts);

  if (feet % 5 !== 0 || perRoundFeet % 5 !== 0 || feet > 120 || perRoundFeet > 120 || ![4, 6, 8, 10, 12, 20].includes(sides) || dice < 1 || dice > 40 || range === "self") return null;

  const step = UPCAST_NEAR.exec(higher);

  return {
    native: {
      narrative: false,
      riders: ["рій у польоті можна атакувати (див. опис)"],
      fields: {
        targeting: { kind: "enemy", range },
        resolution: { kind: "auto" },
        dice,
        dieSides: sides,
        spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: damageTypeOf(damageTypes), delayIfBeyond: { feet, perRoundFeet } }],
        ...(step && { upcastDice: Number(step[1]) }),
      },
    },
  };
};
