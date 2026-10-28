import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import type { ResolvedClassEntry } from "@/types/classes";

export function classSaves(entries: ResolvedClassEntry[], manual: unknown): AbilityKey[] {
  const fromClass = entries[0]?.class?.savingThrows ?? [];

  const manualMap = manual && typeof manual === "object" ? (manual as Record<string, unknown>) : {};

  return ABILITY_KEYS.filter((key) => fromClass.includes(key) || manualMap[key] === true);
}
