import { hasPicks, readCharacterFeats, readPicks } from "@/lib/utils/characters/choices/read";
import { isRecord } from "@/lib/utils/common/is-record";
import type { DraftInput } from "@/types/characters";
import type { ChoiceRace, ChoicesBody, ChoicesState, Picks } from "@/types/choices";
import type { CharacterClassEntry } from "@/types/classes";

function readEntries(raw: unknown): CharacterClassEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((e): CharacterClassEntry[] => {
    if (!isRecord(e) || typeof e.classId !== "string" || typeof e.level !== "number") return [];

    const choices = readPicks(e.choices);

    return [{ classId: e.classId, level: e.level, ...(typeof e.subclassId === "string" && { subclassId: e.subclassId }), ...(hasPicks(choices) && { choices }) }];
  });
}

export const choicesStateOf = (row: { raceChoices?: unknown; feats?: unknown; classes?: unknown }): ChoicesState => ({
  raceChoices: readPicks(row.raceChoices),
  feats: readCharacterFeats(row.feats),
  classes: readEntries(row.classes),
});

export function keepStoredPicks(next: CharacterClassEntry[], stored: unknown): CharacterClassEntry[] {
  const byId = new Map(readEntries(stored).map((e) => [e.classId, e.choices]));

  return next.map(({ choices: _incoming, ...entry }) => {
    const kept = byId.get(entry.classId);

    return kept ? { ...entry, choices: kept } : entry;
  });
}

export const withClassPicks = (entries: CharacterClassEntry[], classChoices: Record<string, Picks>): CharacterClassEntry[] =>
  entries.map((e) => (classChoices[e.classId] ? { ...e, choices: classChoices[e.classId] } : e));

export function lineageName(race: ChoiceRace | null, picks: Picks): string | null | undefined {
  const lineage = race?.choices.find((c) => c.lineage);

  if (!lineage) return undefined;

  const id = picks[lineage.id]?.[0]?.id;

  return lineage.options?.find((o) => o.id === id)?.name ?? null;
}

export const draftChoicesState = (choices: DraftInput["choices"], classId: string | undefined): ChoicesState => ({
  raceChoices: choices?.raceChoices ?? {},
  feats: choices?.feats ?? [],
  classes: classId ? [{ classId, level: 1, ...(choices?.classChoices && { choices: choices.classChoices }) }] : [],
});

export const stateDraftChoices = (state: ChoicesState): NonNullable<DraftInput["choices"]> => ({
  raceChoices: state.raceChoices,
  feats: state.feats,
  ...(state.classes[0]?.choices && { classChoices: state.classes[0].choices }),
});

export const choicesBodyOf = (state: ChoicesState): ChoicesBody => ({
  raceChoices: state.raceChoices,
  feats: state.feats,
  classChoices: Object.fromEntries(state.classes.map((e) => [e.classId, e.choices ?? {}])),
});

/** Збережені вибори чернетки для форми: піки раси лише коли раса та сама, класу — лише коли той самий клас. */
export function storedDraftChoices(row: { race: string; raceChoices?: unknown; feats?: unknown; classes?: unknown }, race: string, classId: string | undefined): DraftInput["choices"] | undefined {
  const state = choicesStateOf(row);

  const entry = state.classes[0];

  const classChoices = entry && classId && entry.classId === classId ? entry.choices : undefined;

  const raceChoices = row.race === race ? state.raceChoices : {};

  if (!hasPicks(raceChoices) && state.feats.length === 0 && !classChoices) return undefined;

  return { raceChoices, feats: state.feats, ...(classChoices && { classChoices }) };
}
