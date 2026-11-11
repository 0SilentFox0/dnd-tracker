import { skillTarget, value } from "./characteristics/derive";
import { readCharacteristics } from "./characteristics/keys";
import { selfTestMod } from "./conditions/test-mod";
import { DIFFICULTY_SL } from "./percentile/difficulty";
import { resolvePercentileTest } from "./percentile/resolve";
import { skillDef } from "./skills/catalog";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import type { SheetTestInput } from "@/lib/utils/rules/systems/types";
import type { SheetPercentileRollResult } from "@/types/characters";

export function rollWfrpSheetTest({ participant, body, character, rng, t, presetRoll }: SheetTestInput): SheetPercentileRollResult {
  if (body.kind !== "test") throw new ContentError(API_ERRORS.ROLL_KIND_MISMATCH, 400);

  const c = readCharacteristics(character);

  const difficulty = body.difficulty ?? "challenging";

  let label: string;

  let target: number;

  if ("characteristic" in body) {
    label = t(`gameTerms.characteristics.${body.characteristic}.label`);
    target = value(c, body.characteristic);
  } else {
    const skill = skillTarget(c, body.skill, body.spec);

    if (!skill) throw new ContentError(API_ERRORS.ROLL_KIND_MISMATCH, 400);

    if (!skill.trained) throw new ContentError(API_ERRORS.SKILL_UNTRAINED, 409);

    const fixed = skillDef(body.skill)?.spec === "fixed";

    label = t(`gameTerms.wfrpSkills.${body.skill}`) + (body.spec ? ` (${fixed ? t(`gameTerms.wfrpSpecs.${body.skill}.${body.spec}`) : body.spec})` : "");
    target = skill.target;
  }

  const r = resolvePercentileTest({ target: target + selfTestMod(participant, "test"), slModifier: DIFFICULTY_SL[difficulty], doubles: false, mode: "normal", rng, presetRoll });

  return { kind: "percentile", label, rawRoll: r.rawRoll, roll: r.roll, reversed: r.reversed, target: r.target, sl: r.sl, outcome: r.outcome, auto: r.auto, difficulty, mode: r.mode };
}
