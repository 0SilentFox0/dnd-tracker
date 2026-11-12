import { planCareerSet } from "../advancement/career";
import type { AdvancementRules } from "../advancement/rules";
import { CHARACTERISTIC_KEYS, type Characteristics, DEFAULT_CHARACTERISTICS } from "../characteristics/keys";
import { isUsableProfile, type SpeciesProfile, STAT_FLOOR } from "./profile";

import { FREE_POINT_MAX, FREE_POINT_MIN } from "@/systems/wfrp/rules/advancement/rules";

export type CreationPicks = {
  career: { mode: "rolled" | "choice" | "free"; careerId: string };
  stats: { mode: "rolled"; rolls: number[] } | { mode: "rearranged"; rolls: number[]; arranged: number[] } | { mode: "free"; points: number[] };
  talents: string[];
};

export type CreationCtx = { profile: SpeciesProfile; rules: AdvancementRules; careerIds: ReadonlySet<string>; featIds: ReadonlySet<string> };

export type PlanDraftResult = { ok: true; characteristics: Characteristics; experience: number } | { ok: false; errors: string[] };

const TALENT_RANK_CAP = 20;

const inRange = (values: number[], min: number, max: number) => values.every((v) => Number.isInteger(v) && v >= min && v <= max);

const sameMultiset = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false;

  const sortedB = [...b].sort((x, y) => x - y);

  return [...a].sort((x, y) => x - y).every((v, i) => v === sortedB[i]);
};

function statValues(stats: CreationPicks["stats"], rules: AdvancementRules, errors: string[]): number[] | null {
  const count = CHARACTERISTIC_KEYS.length;

  if (stats.mode === "free") {
    if (stats.points.length !== count) {
      errors.push("STATS_LENGTH");

      return null;
    }

    if (!inRange(stats.points, FREE_POINT_MIN, FREE_POINT_MAX)) errors.push("POINTS_RANGE");

    if (stats.points.reduce((a, b) => a + b, 0) !== rules.creation.freeBudget) errors.push("POINTS_BUDGET");

    return stats.points;
  }

  if (stats.rolls.length !== count || (stats.mode === "rearranged" && stats.arranged.length !== count)) {
    errors.push("STATS_LENGTH");

    return null;
  }

  if (!inRange(stats.rolls, 2, 20)) errors.push("STATS_RANGE");

  if (stats.mode === "rolled") return stats.rolls;

  if (!sameMultiset(stats.arranged, stats.rolls)) errors.push("STATS_NOT_PERMUTATION");

  return stats.arranged;
}

export function planDraft(picks: CreationPicks, ctx: CreationCtx): PlanDraftResult {
  const { profile, rules } = ctx;

  if (!isUsableProfile(profile)) return { ok: false, errors: ["PROFILE_NOT_READY"] };

  const errors: string[] = [];

  const { career, stats } = picks;

  if (!ctx.careerIds.has(career.careerId)) errors.push("CAREER_UNKNOWN");
  else if (career.mode !== "free" && !profile.careerTable.some((r) => r.careerId === career.careerId)) errors.push("CAREER_NOT_IN_TABLE");

  const values = statValues(stats, rules, errors);

  const tableFeats = new Set(profile.randomTalents.map((r) => r.featId));

  if (picks.talents.length > profile.randomTalentCount) errors.push("TALENT_COUNT");

  if (picks.talents.some((f) => !tableFeats.has(f))) errors.push("TALENT_NOT_IN_TABLE");

  const featIds = [...profile.talents, ...picks.talents];

  if (featIds.some((f) => !ctx.featIds.has(f))) errors.push("FEAT_UNKNOWN");

  if (errors.length || !values) return { ok: false, errors: [...new Set(errors)] };

  const base = Object.fromEntries(CHARACTERISTIC_KEYS.map((k, i) => [k, STAT_FLOOR + (profile.mods[k] ?? 0) + values[i]])) as Characteristics["base"];

  const talents: Record<string, number> = {};

  for (const f of featIds) talents[f] = Math.min(TALENT_RANK_CAP, (talents[f] ?? 0) + 1);

  const characteristics = planCareerSet({ ...DEFAULT_CHARACTERISTICS, base, move: profile.move, fate: profile.fate, extraWounds: profile.extraWounds, talents }, career.careerId);

  return { ok: true, characteristics, experience: rules.creation.careerBonus[career.mode] + rules.creation.statBonus[stats.mode] };
}
