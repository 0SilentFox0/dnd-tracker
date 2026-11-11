import { PACK_HOOKS, type PackRefs } from "../systems";
import { iconColumnOf } from "./import-prepare";
import type { IconsFile, Pack, PackRow } from "./pack";
import { EXTRA_COLUMNS } from "./row-columns";

import { ArtifactSlot } from "@/lib/constants/artifacts";
import { type Bundle, tableOfKind } from "@/lib/server/templates/bundle";
import { CONTENT_ID_RE } from "@/lib/server/templates/ids";
import { artifactAbilities, artifactSetAbilities, raceAbilities, skillAbilities, unitAbilities } from "@/lib/utils/abilities/read";
import { armorStatsFromRow } from "@/lib/utils/artifacts/armor-stats";
import { isWeaponSlot } from "@/lib/utils/artifacts/weapon-slot";
import { weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";
import { IMPORT_SPECS, isImportKind } from "@/lib/utils/content/import";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { RulesetSchema } from "@/lib/utils/rules/schema";
import type { PackKind, TemplateManifest } from "@/lib/utils/templates/manifest";
import type { ImportKind } from "@/types/content-import";

type Row = Record<string, unknown> & { id: string };

export type SlugMap = Partial<Record<PackKind, Record<string, string>>>;

const isEmpty = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (!!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function mapKey(value: unknown, key: string, swap: (id: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => mapKey(v, key, swap));

  if (!isRecord(value)) return value;

  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === key && typeof v === "string" ? swap(v) : mapKey(v, key, swap)]));
}

function derived(kind: ImportKind, row: Row, setArtifacts: ReadonlyMap<string, string[]>): Record<string, unknown> {
  switch (kind) {
    case "units":
      return { abilities: unitAbilities(row) };
    case "skills":
      return { abilities: skillAbilities(row) };
    case "races":
      return { abilities: raceAbilities(row) };
    case "artifacts": {
      const slot = String(row.slot);

      const stats = row as { bonuses?: unknown; modifiers?: unknown };

      return { abilities: artifactAbilities(row), weapon: isWeaponSlot(slot) ? weaponStatsFromRow(stats) : undefined, armor: slot === ArtifactSlot.ARMOR ? (armorStatsFromRow(stats) ?? undefined) : undefined, item: itemStatsFromRow(stats) ?? undefined };
    }
    case "artifact-sets":
      return { abilities: artifactSetAbilities(row), artifactIds: setArtifacts.get(row.id) ?? [] };
    default:
      return {};
  }
}

const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//.test(v);

/** Pack rows keep references by name (importer contract); row ids, icon urls and the legacy-only columns leave the row. */
export function bundleToPack(bundle: Bundle, manifest: TemplateManifest, slugs: SlugMap): Pack {
  const rowsOf = (kind: PackKind): Row[] => {
    const table = tableOfKind(kind);

    return table ? (bundle[table.key] as Row[]) : [];
  };

  const slugOf = (kind: PackKind, id: string) => slugs[kind]?.[id];

  const slugFor = (kind: PackKind, row: Row): string => {
    const slug = slugOf(kind, row.id);

    if (!slug) throw new Error(`No slug for ${kind} row ${row.id} "${String(row.name ?? row.title ?? row.race ?? "")}"`);

    return slug;
  };

  const names = new Map(manifest.kinds.filter(isImportKind).map((kind) => [kind, new Map(rowsOf(kind).map((row) => [row.id, String(row.name)]))]));

  const nameOf = (kind: ImportKind, id: string) => names.get(kind)?.get(id) ?? id;

  const schoolIds = new Map(rowsOf("spell-groups").map((g) => [g.id, String(g.name)]));

  const setArtifacts = new Map<string, string[]>();

  const bySlug = [...rowsOf("artifacts")].sort((a, b) => compareText(slugOf("artifacts", a.id) ?? "", slugOf("artifacts", b.id) ?? ""));

  for (const artifact of bySlug) if (typeof artifact.setId === "string") setArtifacts.set(artifact.setId, [...(setArtifacts.get(artifact.setId) ?? []), artifact.id]);

  const icons: IconsFile = {};

  const refs: PackRefs = { slugOf, idOf: () => undefined };

  const hooks = Object.hasOwn(PACK_HOOKS, manifest.system) ? PACK_HOOKS[manifest.system] : undefined;

  const rows: Partial<Record<PackKind, PackRow[]>> = {};

  for (const kind of manifest.kinds) {
    rows[kind] = rowsOf(kind)
      .map((row): PackRow => {
        const slug = slugFor(kind, row);

        if (!isImportKind(kind)) {
          const out = hooks?.toPackRow ? hooks.toPackRow(kind, row, refs) : row;

          return { slug, ...Object.fromEntries(Object.entries(out).filter(([k, v]) => !["slug", "id", "campaignId"].includes(k) && !isEmpty(v))) } as PackRow;
        }

        const full = { ...row, ...derived(kind, row, setArtifacts) };

        const record: Record<string, unknown> = {};

        for (const field of IMPORT_SPECS[kind].fields) {
          let value = full[field.key];

          if (isEmpty(value)) continue;

          const { ref, nestedRef } = field;

          if (field.type === "ref" && ref) value = nameOf(ref, String(value));
          else if (field.type === "refList" && ref && Array.isArray(value)) value = value.map((id) => nameOf(ref, String(id)));
          else if (nestedRef) value = mapKey(value, nestedRef.key, (id) => nameOf(nestedRef.kind, id));

          record[field.key] = value;
        }

        const iconColumn = iconColumnOf(kind);

        if (isUrl(record[iconColumn])) {
          (icons[kind] ??= {})[slug] = record[iconColumn] as string;
          delete record[iconColumn];
        }

        const extra = Object.fromEntries((EXTRA_COLUMNS[kind] ?? []).flatMap((column) => (isEmpty(row[column]) ? [] : [[column, row[column]]])));

        return { slug, ...(mapKey(record, "school", (id) => schoolIds.get(id) ?? id) as Record<string, unknown>), ...(Object.keys(extra).length > 0 && { extra }) } as PackRow;
      })
      .sort((a, b) => compareText(a.slug, b.slug));
  }

  const counts = Object.fromEntries(manifest.kinds.map((kind) => [kind, rows[kind]?.length ?? 0]));

  const rules = RulesetSchema.parse({ ...(bundle.rules as Record<string, unknown>), system: { key: manifest.system } });

  return { manifest: { ...manifest, counts }, rules, rows, extras: {}, icons };
}

/** Strings that still look like row ids inside pack rows: references the importer cannot resolve by name. */
export function leakedIds(pack: Pack): Record<string, number> {
  const found: Record<string, number> = {};

  const walk = (kind: string, path: string, value: unknown) => {
    if (typeof value === "string") {
      if (CONTENT_ID_RE.test(value)) found[`${kind}.${path}`] = (found[`${kind}.${path}`] ?? 0) + 1;
    } else if (Array.isArray(value)) value.forEach((v) => walk(kind, path, v));
    else if (isRecord(value)) for (const [k, v] of Object.entries(value)) walk(kind, path ? `${path}.${k}` : k, v);
  };

  for (const [kind, rows] of Object.entries(pack.rows)) for (const row of rows ?? []) walk(kind, "", row);

  return found;
}
