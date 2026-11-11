import type { IconsFile, PackRow } from "../../lib/pack";

/** The engine compares damageBonus/flag schools with spell group ids; pack files keep portable names. */
export function resolveSchoolRefs<T>(value: T, idByName: ReadonlyMap<string, string>): T {
  if (Array.isArray(value)) return value.map((v) => resolveSchoolRefs(v, idByName)) as T;

  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === "school" && typeof v === "string" ? (idByName.get(v) ?? v) : resolveSchoolRefs(v, idByName)])) as T;
}

type FeatureGroup = { abilities?: Array<Record<string, unknown> & { id?: string }> };

const iconAbilities = (groups: unknown, scope: string, urls: Record<string, string>) =>
  Array.isArray(groups) ? groups.map((g: FeatureGroup) => ({ ...g, abilities: g.abilities?.map((a) => (a.id && urls[`${scope}/${a.id}`] ? { ...a, icon: urls[`${scope}/${a.id}`] } : a)) })) : groups;

/** Icons of class features and subclasses live under the `features`/`subclasses` keys of icons.json, scoped by `<class slug>[/<subclass id>]`. */
export function withClassIcons(rows: PackRow[], icons: IconsFile): PackRow[] {
  const features = icons.features ?? {};

  const subclassIcons = icons.subclasses ?? {};

  return rows.map((row) => {
    const subclasses = Array.isArray(row.subclasses)
      ? row.subclasses.map((s: Record<string, unknown> & { id?: string }) => {
          const scope = `${row.slug}/${s.id}`;

          const icon = subclassIcons[scope];

          return { ...s, features: iconAbilities(s.features, scope, features), ...(icon ? { icon } : {}) };
        })
      : row.subclasses;

    return { ...row, features: iconAbilities(row.features, row.slug, features), subclasses };
  });
}
