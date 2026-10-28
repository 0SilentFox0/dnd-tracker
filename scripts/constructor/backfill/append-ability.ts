import { type Ability, AbilitySchema } from "@/lib/utils/abilities/schema";

export type AppendResult = { abilities: unknown; changed: boolean; warning?: string };

const hasId = (item: unknown, id: string) => typeof item === "object" && item !== null && (item as { id?: unknown }).id === id;

export function appendAbility(raw: unknown, ability: Ability, isSatisfied?: (item: unknown) => boolean): AppendResult {
  if (!Array.isArray(raw)) return { abilities: raw, changed: false, warning: `abilities не є масивом, пропущено ${ability.id}` };

  if (raw.some((item) => hasId(item, ability.id) || isSatisfied?.(item))) return { abilities: raw, changed: false };

  return { abilities: [...raw, AbilitySchema.parse(ability)], changed: true };
}
