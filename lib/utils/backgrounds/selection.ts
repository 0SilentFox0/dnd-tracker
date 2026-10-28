import { readPicks } from "@/lib/utils/characters/choices/read";
import type { ChoicesBody, ChoicesState } from "@/types/choices";

export function backgroundFields(row: { backgroundId?: unknown; backgroundChoices?: unknown; backgroundFeatPicks?: unknown }): Pick<ChoicesState, "backgroundId" | "backgroundChoices" | "backgroundFeatPicks"> {
  if (row.backgroundId === undefined) return {};

  return { backgroundId: typeof row.backgroundId === "string" ? row.backgroundId : null, backgroundChoices: readPicks(row.backgroundChoices), backgroundFeatPicks: readPicks(row.backgroundFeatPicks) };
}

export function mergeBackground(before: ChoicesState, body: ChoicesBody): Pick<ChoicesState, "backgroundId" | "backgroundChoices" | "backgroundFeatPicks"> {
  if (body.backgroundId === undefined && body.backgroundChoices === undefined && body.backgroundFeatPicks === undefined) return backgroundFields(before);

  const id = body.backgroundId === undefined ? before.backgroundId : body.backgroundId;

  const changed = id !== before.backgroundId;

  return { backgroundId: id ?? null, backgroundChoices: id ? body.backgroundChoices ?? (changed ? {} : before.backgroundChoices ?? {}) : {}, backgroundFeatPicks: id ? body.backgroundFeatPicks ?? (changed ? {} : before.backgroundFeatPicks ?? {}) : {} };
}
