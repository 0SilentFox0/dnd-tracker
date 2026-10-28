import type { ErrorIssue } from "@/lib/constants/api-errors";
import { columnRefIssues } from "@/lib/utils/abilities/class-columns";
import type { Choice } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

export function choiceColumnIssues(choices: readonly Choice[] | undefined, columns: readonly ClassColumn[] | null): ErrorIssue[] {
  return (choices ?? []).flatMap((c, i) => {
    const scale = typeof c.count === "object" ? c.count.scale : undefined;

    return [
      ...(scale !== undefined && !(columns ?? []).some((col) => col.key === scale) ? [{ path: [i, "count"], message: "classes.validation.columnMissing", params: { key: scale } }] : []),
      ...(c.options ?? []).flatMap((o, k) => columnRefIssues(o.abilities, columns).map((issue) => ({ ...issue, path: [i, "options", k, "abilities", ...issue.path] }))),
    ];
  });
}

type FeatureChoices = { choices?: readonly Choice[] };

export function classChoiceIdIssues(features: readonly FeatureChoices[] | undefined, subclasses: ReadonlyArray<{ features: readonly FeatureChoices[] }> | undefined): ErrorIssue[] {
  const ids = (list: readonly FeatureChoices[] | undefined) => (list ?? []).flatMap((f) => (f.choices ?? []).map((c) => c.id));

  const own = ids(features);

  const repeated = (list: string[]) => list.filter((id, i) => list.indexOf(id) !== i);

  const ownRepeated = new Set(repeated(own));

  return [
    ...repeated(own).map((id) => ({ path: ["features"], message: "classes.validation.choiceIdRepeated", params: { id } })),
    ...(subclasses ?? []).flatMap((s, k) => repeated([...own, ...ids(s.features)]).filter((id) => !ownRepeated.has(id)).map((id) => ({ path: ["subclasses", k, "features"], message: "classes.validation.choiceIdRepeated", params: { id } }))),
  ];
}
