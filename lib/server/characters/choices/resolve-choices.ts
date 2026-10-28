import type { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import "server-only";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { type ChoiceDb, loadChoiceRefs } from "@/lib/server/characters/choices/load-refs";
import { errorResponse } from "@/lib/utils/api/api-response";
import { planChoices } from "@/lib/utils/characters/choices/plan";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { ChoicesState } from "@/types/choices";
import type { CharacterClassEntry } from "@/types/classes";

export type ChoiceFields = { raceChoices: Prisma.InputJsonValue; feats: Prisma.InputJsonValue; classes: Prisma.InputJsonValue; subrace?: string | null; backgroundId?: string | null; backgroundChoices?: Prisma.InputJsonValue; backgroundFeatPicks?: Prisma.InputJsonValue } & Partial<Record<AbilityKey, number>>;

export const characterClassMode = (rules: Ruleset, classes: readonly CharacterClassEntry[]): boolean => rules.classes.enabled && classes.length > 0;

const json = (v: unknown) => v as Prisma.InputJsonValue;

export async function resolveCharacterChoices(input: {
  campaignId: string;
  rules: Ruleset;
  isDM: boolean;
  character: { race: string; level: number; skills: unknown } & Record<AbilityKey, number>;
  before: ChoicesState;
  after: ChoicesState;
  refs?: ChoiceRefs;
  db?: ChoiceDb;
}): Promise<{ ok: true; fields: ChoiceFields; state: ChoicesState } | { ok: false; response: NextResponse }> {
  const classMode = characterClassMode(input.rules, input.after.classes);

  const refs = input.refs ?? (await loadChoiceRefs(input.campaignId, input.character.race, { classMode, backgroundIds: [input.before.backgroundId, input.after.backgroundId], db: input.db }));

  const scores = Object.fromEntries(ABILITY_KEYS.map((k) => [k, input.character[k]])) as Record<AbilityKey, number>;

  const plan = planChoices({ before: input.before, after: input.after, refs, classMode, isDM: input.isDM, level: input.character.level, scores, skills: input.character.skills });

  if (!plan.ok) return { ok: false, response: errorResponse(plan.message, plan.status, plan.issues) };

  return {
    ok: true,
    state: plan.state,
    fields: {
      ...(plan.state.backgroundId !== undefined && { backgroundId: plan.state.backgroundId, backgroundChoices: json(plan.state.backgroundChoices ?? {}), backgroundFeatPicks: json(plan.state.backgroundFeatPicks ?? {}) }),
      raceChoices: json(plan.state.raceChoices),
      feats: json(plan.state.feats),
      classes: json(plan.state.classes),
      ...(plan.subrace !== undefined && { subrace: plan.subrace }),
      ...plan.scores,
    },
  };
}
