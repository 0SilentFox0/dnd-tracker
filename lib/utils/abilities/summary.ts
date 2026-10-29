import { describeCondition } from "./registry/conditions";
import { describeEffect } from "./registry/effects";
import { limitsSegments } from "./registry/labels";
import { describeTrigger } from "./registry/triggers";
import { type OwnerKind, readAbilities } from "./read";
import { type Ability, AbilitySchema } from "./schema";
import type { AbilityFlowSummary } from "./segments";

export type { AbilityFlowSummary };

export function summarizeAbility(a: Ability): AbilityFlowSummary {
  return {
    when: describeTrigger(a.trigger),
    if: a.condition ? describeCondition(a.condition) : [],
    then: a.effects.map(describeEffect),
    limits: limitsSegments(a.limits),
  };
}

export function abilitySummary(kind: OwnerKind, row: { id: string; abilities?: unknown }): AbilityFlowSummary[] {
  return readAbilities(kind, row).abilities.filter((a) => AbilitySchema.safeParse(a).success).map(summarizeAbility);
}

/** Replaces heavy ability/legacy columns of a list row with short summary lines. */
export function withAbilitySummary<T extends { id: string; abilities?: unknown }, K extends keyof T = never>(kind: OwnerKind, row: T, drop: readonly K[] = []) {
  const summary = abilitySummary(kind, row);

  const rest = { ...row } as Record<string, unknown>;

  delete rest.abilities;

  for (const k of drop) delete rest[k as string];

  return { ...(rest as Omit<T, "abilities" | K>), abilitySummary: summary };
}
