import type { ClassProgression, ProgressionItem, ProgressionPick, ProgressionRow } from "@/types/classes";

export interface PathRows {
  reached: ProgressionRow[];
  focus: ProgressionRow[];
  future: ProgressionRow[];
}

export const chosenSubclassId = (progression: ClassProgression): string | null => progression.subclasses.find((s) => s.chosen)?.id ?? null;

export const rowItems = (row: ProgressionRow, chosen: string | null): ProgressionItem[] => [...row.base, ...(chosen ? (row.bySubclass[chosen] ?? []) : [])];

export interface SubclassPreview {
  id: string;
  name: string;
  gains: { level: number; names: string[] }[];
}

export const hasSubclassOnly = (row: ProgressionRow, chosen: string | null): boolean => !chosen && Object.values(row.bySubclass).some((items) => items.length > 0);

export function subclassPreview(progression: ClassProgression): SubclassPreview[] {
  return progression.subclasses.map(({ id, name }) => ({
    id,
    name,
    gains: progression.rows
      .map((row) => ({ level: row.level, names: (row.bySubclass[id] ?? []).map((item) => item.name) }))
      .filter((g) => g.names.length > 0)
      .sort((a, b) => a.level - b.level),
  }));
}

export function splitPathRows(progression: ClassProgression): PathRows {
  const chosen = chosenSubclassId(progression);

  const out: PathRows = { reached: [], focus: [], future: [] };

  for (const row of progression.rows) {
    if (rowItems(row, chosen).length === 0 && row.picks.length === 0) continue;

    const waiting = row.picks.some((p) => p.status === "open");

    if (row.state === "current" || row.state === "next" || (row.state === "reached" && waiting)) out.focus.push(row);
    else if (row.state === "reached") out.reached.push(row);
    else if (row.state === "future") out.future.push(row);
  }

  return out;
}

/** same format as `WizardStep.key` */
export const pickStepKey = (classId: string, pick: Pick<ProgressionPick, "kind" | "key">): string => (pick.kind === "subclass" ? `subclass:${classId}` : `classes.${classId}.${pick.key}`);

export function firstOpenSpellKey(list: readonly ClassProgression[] | undefined): string | undefined {
  for (const progression of list ?? []) {
    for (const row of progression.rows) {
      const pick = row.picks.find((p) => p.kind === "spell" && p.status === "open");

      if (pick) return pickStepKey(progression.classId, pick);
    }
  }

  return undefined;
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

export function pathSummary(progression: ClassProgression): { level: number | null; open: number } {
  const level = progression.rows.find((r) => r.state === "current")?.level ?? null;

  const open = progression.rows.reduce((sum, r) => sum + r.picks.filter((p) => p.status === "open").length, 0);

  return { level, open };
}

export const classLevels = (list: readonly ClassProgression[]): { className: string; level: number }[] =>
  list.map((p) => ({ className: p.className, level: pathSummary(p).level ?? 0 }));

export const classSectionOpen = (list: readonly ClassProgression[], progression: ClassProgression): boolean => list.length <= 2 || pathSummary(progression).open > 0;
