import type { ClassProgression, ProgressionItem, ProgressionRow } from "@/types/classes";

export interface PathRows {
  reached: ProgressionRow[];
  focus: ProgressionRow[];
  future: ProgressionRow[];
}

export const chosenSubclassId = (progression: ClassProgression): string | null => progression.subclasses.find((s) => s.chosen)?.id ?? null;

export const rowItems = (row: ProgressionRow, chosen: string | null): ProgressionItem[] => [...row.base, ...(chosen ? (row.bySubclass[chosen] ?? []) : [])];

export function splitPathRows(progression: ClassProgression): PathRows {
  const chosen = chosenSubclassId(progression);

  const out: PathRows = { reached: [], focus: [], future: [] };

  for (const row of progression.rows) {
    if (rowItems(row, chosen).length === 0 && row.picks.length === 0) continue;

    if (row.state === "reached") out.reached.push(row);
    else if (row.state === "current" || row.state === "next") out.focus.push(row);
    else if (row.state === "future") out.future.push(row);
  }

  return out;
}

export function openSpellPicks(list: readonly ClassProgression[] | undefined): number {
  let missing = 0;

  for (const progression of list ?? []) {
    for (const row of progression.rows) {
      for (const pick of row.picks) {
        if (pick.kind === "spell" && pick.status === "open") missing += pick.required - (pick.done ?? 0);
      }
    }
  }

  return missing;
}
