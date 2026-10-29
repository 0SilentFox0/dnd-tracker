import { dynamicTextRef, joinLines } from "@/lib/i18n/text-ref";
import type { LogLine, TextArg, TextRef } from "@/types/text";

const DAMAGE_TYPES: ReadonlySet<string> = new Set(["fire", "cold", "lightning", "acid", "poison", "necrotic", "radiant", "thunder", "psychic", "force", "bludgeoning", "piercing", "slashing", "bleed"]);

export const flag = (value: unknown): string => String(!!value);

export const damageTypeArg = (type: string): TextArg => (DAMAGE_TYPES.has(type) ? dynamicTextRef(`gameTerms.damageTypes.${type}`) : type);

export const abilityArg = (key: string): TextRef => dynamicTextRef(`gameTerms.abilities.${key}.label`);

export const optionArg = (set: string, key: string): TextRef => dynamicTextRef(`abilityRegistry.options.${set}.${key}`);

/** " (a, b)" for a list of labels; empty for "all". */
export function parenList(items: readonly LogLine[] | "all", set?: string): LogLine {
  if (items === "all") return "";

  const parts = items.map((item) => (typeof item === "string" && set ? optionArg(set, item) : item));

  return joinLines([" (", joinLines(parts, ", "), ")"]);
}

export function refMap<K extends string>(prefix: string, keys: readonly K[]): Record<K, TextRef> {
  return Object.fromEntries(keys.map((key) => [key, dynamicTextRef(`${prefix}.${key}`)])) as Record<K, TextRef>;
}

export const roundsOf = (e: { duration?: { rounds: number } }): number | string => e.duration?.rounds ?? "?";
