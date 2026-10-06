import { describeAbility } from "./registry/effects";
import { type OwnerKind, readAbilities } from "./read";
import { AbilitySchema } from "./schema";

export function abilitySummary(kind: OwnerKind, row: { id: string; abilities?: unknown }): string[] {
  return readAbilities(kind, row).abilities.filter((a) => AbilitySchema.safeParse(a).success).map(describeAbility);
}

/** Replaces heavy ability/legacy columns of a list row with short summary lines. */
export function withAbilitySummary<T extends { id: string; abilities?: unknown }, K extends keyof T = never>(kind: OwnerKind, row: T, drop: readonly K[] = []) {
  const summary = abilitySummary(kind, row);

  const rest = { ...row } as Record<string, unknown>;

  delete rest.abilities;

  for (const k of drop) delete rest[k as string];

  return { ...(rest as Omit<T, "abilities" | K>), abilitySummary: summary };
}
