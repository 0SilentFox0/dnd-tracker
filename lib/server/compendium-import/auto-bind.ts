import { canonicalKey, nameKey } from "./identity";
import { expectedKind } from "./plan";
import type { AdaptedEntry, CompendiumRef, TargetKind } from "./types";

export interface NamedRow { id: string; name: string }
export interface PendingRef { key: string; ref: CompendiumRef; kind: TargetKind }

export const refKeyOf = (ref: CompendiumRef) => canonicalKey(ref.kind, ref.name, ref.source, ref.edition, ref.parent);

export function pendingRefs(entries: AdaptedEntry[], isKnown: (key: string) => boolean): PendingRef[] {
  const ownKeys = new Set(entries.map((e) => e.key));

  const own = new Set(entries.map((e) => `${e.kind}:${nameKey(e.name)}`));

  const pending = new Map<string, PendingRef>();

  for (const ref of entries.flatMap((e) => [...e.refs, ...(e.mergeParent ? [e.mergeParent] : [])])) {
    const kind = expectedKind(ref);

    const key = refKeyOf(ref);

    if (!kind || ownKeys.has(key) || isKnown(key) || own.has(`${kind}:${nameKey(ref.name)}`)) continue;

    pending.set(key, { key, ref, kind });
  }

  return [...pending.values()];
}

export const findByName = (rows: NamedRow[] | undefined, name: string) => {
  const wanted = nameKey(name);

  return rows?.find((row) => nameKey(row.name) === wanted);
};
