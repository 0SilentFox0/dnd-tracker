import { nameKey, sameEdition } from "./identity";
import { normalized } from "./parse";
import { expectedKind, refKey } from "./plan";
import type { AdaptedEntry, CompendiumRef, TargetKind } from "./types";

export interface NamedRow { id: string; name: string }
export interface PendingRef { key: string; ref: CompendiumRef; kind: TargetKind; parent: boolean }

export function pendingRefs(entries: AdaptedEntry[], isKnown: (key: string) => boolean): PendingRef[] {
  const ownKeys = new Set(entries.map((e) => e.key));

  const own = new Set(entries.map((e) => `${e.kind}:${nameKey(e.name)}:${normalized(e.source)}`));

  const pending = new Map<string, PendingRef>();

  const parents = new Set(entries.flatMap((e) => e.mergeParent ? [refKey(e.mergeParent)] : []));

  const editionOf = new Map(entries.map((e) => [`${e.kind}:${nameKey(e.name)}:${normalized(e.source)}`, e.edition]));

  for (const ref of entries.flatMap((e) => [...e.refs, ...(e.mergeParent ? [e.mergeParent] : [])])) {
    const kind = expectedKind(ref);

    const key = refKey(ref);

    const ownId = `${kind}:${nameKey(ref.name)}:${normalized(ref.source)}`;

    if (!kind || ownKeys.has(key) || isKnown(key) || (own.has(ownId) && sameEdition(editionOf.get(ownId) ?? "unknown", ref.edition))) continue;

    pending.set(key, { key, ref, kind, parent: parents.has(key) });
  }

  return [...pending.values()];
}

export const findByName = (rows: NamedRow[] | undefined, name: string) => {
  const wanted = nameKey(name);

  return rows?.find((row) => nameKey(row.name) === wanted);
};

export function matchCampaignRows(pending: PendingRef[], names: Record<string, NamedRow[] | undefined>, isImported: (kind: TargetKind, id: string) => boolean) {
  return pending.flatMap((p) => {
    const row = findByName(names[p.kind], p.ref.name);

    return row && (!p.parent || isImported(p.kind, row.id)) ? [{ ...p, row }] : [];
  });
}

export function matchTemplateRows(pending: PendingRef[], names: Record<string, NamedRow[] | undefined>, allowMixedEdition: boolean | undefined) {
  return pending.flatMap((p) => {
    const row = findByName(names[p.kind], p.ref.name);

    return row && (p.ref.edition === "one" || allowMixedEdition) ? [{ ...p, row }] : [];
  });
}
