import { type AbilityKey, isAbilityKey } from "@/lib/constants/abilities";
import type { CharacterClassEntry, ResolvedClassEntry } from "@/types/classes";

export function classSpellcastingAbility(entries: ResolvedClassEntry[], manual?: string | null): AbilityKey | null {
  if (isAbilityKey(manual)) return manual;

  return entries.find((e) => e.class && e.class.caster !== "none")?.class?.spellcastingAbility ?? null;
}

export function classesLabel(entries: ResolvedClassEntry[]): string {
  return entries.flatMap((e) => (e.class ? [`${e.class.name} ${e.level}`] : [])).join(" / ");
}

export function subclassesLabel(entries: ResolvedClassEntry[]): string | null {
  const names = entries.flatMap((e) => (e.subclass ? [e.subclass.name] : []));

  return names.length > 0 ? names.join(", ") : null;
}

export function hitDiceLabel(entries: ResolvedClassEntry[]): string {
  return entries.flatMap((e) => (e.class ? [`${e.level}d${e.class.hitDie}`] : [])).join(" + ");
}

export function classTotalLevel(entries: CharacterClassEntry[]): number {
  return entries.reduce((sum, e) => sum + e.level, 0);
}
