import type { Character } from "@/types/characters";

export function getCharacterImmunities(
  character: Character | { immunities?: string[] | null } | { immunities?: unknown } | Record<string, unknown>
): string[] {
  return Array.isArray(character.immunities) ? character.immunities : [];
}
