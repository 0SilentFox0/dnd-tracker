import type { AbilityKey } from "@/lib/constants/abilities";
import type { ChoiceOption, FeatData } from "@/types/choices";

export type Requirement = { met: boolean } & (
  | { kind: "level"; need: number; have: number }
  | { kind: "ability"; abilities: AbilityKey[]; need: number; have: number }
  | { kind: "option"; missing: string[] }
  | { kind: "manual"; text: string }
  | { kind: "text"; text: string }
);

export interface RequirementCtx {
  totalLevel: number;
  level: number;
  scores: Readonly<Record<AbilityKey, number>>;
  picked?: ReadonlySet<string>;
}

function featRequirements(feat: FeatData, ctx: RequirementCtx): Requirement[] {
  const { level, scores, manualText, text } = feat.prerequisite;

  const out: Requirement[] = [];

  if (level) out.push({ kind: "level", need: level, have: ctx.totalLevel, met: ctx.totalLevel >= level });

  if (scores) {
    const have = Math.max(...scores.abilities.map((a) => ctx.scores[a] ?? 0));

    out.push({ kind: "ability", abilities: scores.abilities, need: scores.min, have, met: have >= scores.min });
  }

  for (const line of manualText ?? []) out.push({ kind: "manual", text: line, met: true });

  if (text) out.push({ kind: "text", text, met: true });

  return out;
}

function optionRequirements(option: ChoiceOption, ctx: RequirementCtx): Requirement[] {
  const out: Requirement[] = [];

  if (option.minLevel) out.push({ kind: "level", need: option.minLevel, have: ctx.level, met: ctx.level >= option.minLevel });

  if (option.requires?.length) {
    const missing = option.requires.filter((id) => !ctx.picked?.has(id));

    out.push({ kind: "option", missing, met: missing.length === 0 });
  }

  return out;
}

export const requirementsOf = (source: FeatData | ChoiceOption, ctx: RequirementCtx): Requirement[] => ("prerequisite" in source ? featRequirements(source, ctx) : optionRequirements(source, ctx));

export const isUnmet = (r: Requirement): boolean => !r.met;
