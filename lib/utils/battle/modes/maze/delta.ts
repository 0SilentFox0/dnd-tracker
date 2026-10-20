import type { MazeConfig } from "@/types/battle";

// мітка чи прапорець не тягнуть ~20 КБ стін: шлемо лише змінені поля; null — треба повна карта
export function mazeChange(before: MazeConfig | null | undefined, after: MazeConfig | null | undefined): Partial<MazeConfig> | null | undefined {
  if (before === after || (!before && !after)) return undefined;

  if (!before || !after) return null;

  if (before.walls !== after.walls && JSON.stringify(before.walls) !== JSON.stringify(after.walls)) return null;

  const changed: Record<string, unknown> = {};

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof MazeConfig>) {
    if (key === "walls" || JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;

    if (after[key] === undefined) return null;

    changed[key] = after[key];
  }

  return Object.keys(changed).length > 0 ? (changed as Partial<MazeConfig>) : undefined;
}
