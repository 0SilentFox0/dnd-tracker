import { IMPORT_SPECS, isImportKind, refKindsOf } from "@/lib/utils/content/import";
import type { PackKind } from "@/lib/utils/templates/manifest";

const depsOf = (kind: PackKind, present: ReadonlySet<PackKind>): PackKind[] => {
  if (!isImportKind(kind)) return [];

  // artifacts <-> artifact-sets: sets go after artifacts; the artifact setId is written in a second pass (D10)
  return refKindsOf(IMPORT_SPECS[kind]).filter((dep) => dep !== kind && present.has(dep) && !(kind === "artifacts" && dep === "artifact-sets"));
};

/** Dependencies first, ties broken by the given order; kinds the importer does not know (skillTrees, tracks) come last. */
export function importOrder(kinds: readonly PackKind[]): PackKind[] {
  const present = new Set(kinds);

  const known = kinds.filter(isImportKind);

  const pending = new Set<PackKind>(known);

  const out: PackKind[] = [];

  while (pending.size > 0) {
    const next = known.find((kind) => pending.has(kind) && depsOf(kind, present).every((dep) => !pending.has(dep)));

    if (!next) throw new Error(`Import kinds form a cycle: ${[...pending].join(", ")}`);

    pending.delete(next);
    out.push(next);
  }

  return [...out, ...kinds.filter((kind) => !isImportKind(kind))];
}
