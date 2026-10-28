import { columnValueAt } from "@/lib/utils/characters/classes/columns";
import type { Choice, ChoiceOwner } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

export function resolveChoiceCount(choice: Choice, level: number, columns: readonly ClassColumn[] = []): number {
  if (choice.kind === "abilityScore") return choice.points ?? 0;

  if (typeof choice.count === "number") return choice.count;

  const { scale } = choice.count;

  const column = columns.find((c) => c.key === scale);

  const value = column ? columnValueAt(column, level) : null;

  return typeof value === "number" && value > 0 ? value : 0;
}

export const isChoiceOpen = (choice: Choice, level: number, owner: ChoiceOwner): boolean => owner === "feat" || choice.level <= level;
