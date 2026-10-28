import { background, feat, gameClass, race } from "./adapters/characters";
import { item, materialPage, monster, spell } from "./adapters/content";
import {
  array,
  description,
  effectiveEdition,
  object,
  str,
  unsupported,
} from "./adapters/shared";
import { type FeatureResolutionContext, resolveCompendiumFeatures } from "./feature-resolution";
import { canonicalKey, nestedId } from "./identity";
import {
  byteLength,
  type Compendium,
  COMPENDIUM_LIMITS,
  type JsonRecord,
  normalized,
} from "./parse";
import {
  type AdaptedCompendium,
  type AdaptedEntry,
  type Adapter,
  type AdapterContext,
  type AdaptOptions,
  issue,
} from "./types";

const adapters: Record<string, Adapter> = {
  spell,
  monster,
  item,
  baseitem: item,
  race,
  background,
  feat,
  class: gameClass,
  table: materialPage,
  reward: materialPage,
  condition: materialPage,
  skill: materialPage,
  language: materialPage,
  itemProperty: materialPage,
  itemType: materialPage,
};

const nestedKinds = new Set([
  "subclass",
  "subclassFeature",
  "classFeature",
  "subrace",
  "optionalfeature",
  "book",
  "adventure",
  "bookData",
  "adventureData",
]);

export { effectiveEdition } from "./adapters/shared";

export function adaptCompendium(
  root: Compendium,
  options: AdaptOptions = {}
): AdaptedCompendium {
  const entries: AdaptedEntry[] = [];

  const issues: AdaptedCompendium["issues"] = [];

  const meta = object(root._meta);

  const sources = array(meta.sources).map(object);

  const sourceIds = new Set(sources.map((s) => normalized(str(s.json))));

  const blocked: NonNullable<AdaptedCompendium["blocked"]> = [];

  const sourceRows = new Map<string, JsonRecord>();

  const seen = new Set<string>();

  const usedOptionals = new Set<string>();

  const embedded: Record<string, number> = Object.create(null);

  const featureContext: FeatureResolutionContext = {
    root,
    editionFallback: meta.edition,
    issues,
    embedded,
    usedOptionals,
  };

  let selected = 0;

  const enabled = (kind: string) =>
    options.categories
      ? options.categories.includes(kind)
      : !["book", "bookData", "adventure", "adventureData"].includes(kind);

  function add(
    kind: string,
    row: JsonRecord,
    path: string,
    adapter: Adapter,
    parent: string[] = []
  ): AdaptedEntry | undefined {
    if (options.excludedPaths?.includes(path)) return;

    if (++selected > COMPENDIUM_LIMITS.selected)
      throw Error("SELECTED_RECORDS");

    const source = str(row.source) || options.sourceBindings?.[path] || "";

    const name = str(row.name);

    if (!source || !name.trim()) {
      blocked.push({ path });
      issues.push(
        issue(
          !source ? "SOURCE_REQUIRED" : "NAME_REQUIRED",
          path,
          "error",
          "Задайте явне джерело та назву запису"
        )
      );

      return;
    }

    const edition = effectiveEdition(row.edition, meta.edition);

    const key = canonicalKey(kind, name, source, edition, parent);

    if (seen.has(key)) {
      issues.push(
        issue("DUPLICATE_IDENTITY", path, "error", "Усуньте дубль ідентичності")
      );

      return;
    }

    seen.add(key);

    if (row._copy !== undefined || row.inherits !== undefined) {
      blocked.push({ key, path });
      issues.push(
        issue(
          "UNSUPPORTED_COPY",
          path,
          "error",
          "Розгорніть copy/inherits у вихідному файлі або виключіть запис"
        )
      );

      return;
    }

    const local = [] as AdaptedEntry["issues"];

    if (!sourceIds.has(normalized(source)))
      local.push(
        issue(
          "SOURCE_METADATA_MISSING",
          path,
          "warning",
          "Додайте атрибуцію джерела, якщо вона відома"
        )
      );

    if (edition === "unknown")
      local.push(
        issue("EDITION_UNKNOWN", path, "warning", "Перевірте редакцію правил")
      );

    const ctx: AdapterContext = {
      root,
      inputKind: kind,
      path,
      source,
      edition,
      key,
      issues: local,
    };

    const result = adapter(row, ctx);

    if (!result) return;

    if (byteLength(result.notes ?? "") > 64 * 1024)
      local.push(
        issue("NOTES_SIZE", path, "error", "Скоротіть опис або виключіть запис")
      );

    const attribution = Object.fromEntries(
      ["page", "additionalSources", "otherSources", "referenceSources"]
        .filter((k) => row[k] !== undefined)
        .map((k) => [k, row[k]])
    );

    const entry: AdaptedEntry = {
      key,
      inputPath: path,
      inputKind: kind,
      name,
      source,
      edition,
      body: result.body,
      refs: result.refs ?? [],
      notes: result.notes ?? "",
      kind: result.kind,
      issues: local,
      attribution,
    };

    sourceRows.set(key, row);
    entries.push(entry);
    issues.push(...local);

    return entry;
  }

  for (const [kind, raw] of Object.entries(root)) {
    if (kind === "_meta" || !enabled(kind)) continue;

    if (!adapters[kind] && !nestedKinds.has(kind)) {
      issues.push(
        issue(
          "UNSUPPORTED_CATEGORY",
          kind,
          "warning",
          "Перенесіть потрібні матеріали вручну"
        )
      );
      continue;
    }

    if (!adapters[kind]) continue;

    array(raw).forEach((value, i) => {
      const row = object(value);

      const entry = add(kind, row, `${kind}[${i}]`, adapters[kind]);

      if (kind === "spell" && entry && typeof row.school === "string") {
        const key = canonicalKey(
          "spellSchool",
          row.school,
          "5etools-format",
          "unknown"
        );

        if (!entries.some((e) => e.key === key))
          entries.push({
            key,
            inputKind: "spellSchool",
            name: row.school,
            source: "5etools-format",
            edition: "unknown",
            kind: "spell-groups",
            body: { name: row.school },
            refs: [],
            notes: "",
            issues: [],
          });

        entry.refs.push({
          path: ["groupId"],
          kind: "spellSchool",
          name: row.school,
          source: "5etools-format",
          edition: "unknown",
        });
      }
    });
  }

  for (const entry of entries.filter((e) => e.inputKind === "class")) {
    const row = sourceRows.get(entry.key);

    entry.body.features = resolveCompendiumFeatures(
      row?.classFeatures,
      "classFeature",
      `${entry.key}.classFeatures`,
      featureContext
    );
  }

  if (enabled("subclass"))
    array(root.subclass)
      .map(object)
      .forEach((row, i) => {
        const parent = [str(row.className), str(row.classSource)];

        const entry = add(
          "subclass",
          row,
          `subclass[${i}]`,
          (_r, ctx) => ({
            kind: "classes",
            body: {
              subclasses: [
                {
                  id: nestedId(ctx.key),
                  name: row.name,
                  features: resolveCompendiumFeatures(
                    row.subclassFeatures,
                    "subclassFeature",
                    `${ctx.key}.subclassFeatures`,
                    featureContext
                  ),
                },
              ],
            },
            notes: [
              description(row, ctx),
              unsupported(
                row,
                ["className", "classSource", "shortName", "subclassFeatures"],
                ctx
              ),
            ]
              .filter(Boolean)
              .join("\n"),
          }),
          parent
        );

        if (entry)
          entry.mergeParent = {
            path: [],
            kind: "class",
            name: parent[0],
            source: parent[1],
            edition: entry.edition,
          };
      });

  if (enabled("subrace"))
    array(root.subrace)
      .map(object)
      .forEach((row, i) => {
        const parent = [str(row.raceName), str(row.raceSource)];

        const entry = add(
          "subrace",
          row,
          `subrace[${i}]`,
          (_r, ctx) => ({
            kind: "races",
            body: {
              choices: [
                {
                  id: "import-lineage",
                  label: "Походження",
                  kind: "option",
                  count: 1,
                  lineage: true,
                  options: [
                    {
                      id: nestedId(ctx.key),
                      name: row.name,
                      description: description(row, ctx),
                      abilities: [],
                    },
                  ],
                },
              ],
            },
            notes: unsupported(row, ["raceName", "raceSource"], ctx),
          }),
          parent
        );

        if (entry)
          entry.mergeParent = {
            path: [],
            kind: "race",
            name: parent[0],
            source: parent[1],
            edition: entry.edition,
          };
      });

  for (const kind of ["book", "adventure"] as const) {
    if (!enabled(kind)) continue;

    array(root[kind])
      .map(object)
      .forEach((manifest, index) => {
        const data = array(root[`${kind}Data`])
          .map(object)
          .filter(
            (d) =>
              d.id === manifest.id &&
              (!d.source || d.source === manifest.source)
          );

        if (data.length !== 1) {
          issues.push(
            issue(
              "CORPUS_DATA_MISSING",
              `${kind}[${index}]`,
              "warning",
              "Додайте відповідні дані глав або матеріали вручну"
            )
          );

          return;
        }

        array(data[0].data).forEach((chapter, i) =>
          add(
            `${kind}Chapter`,
            {
              ...object(chapter),
              name: `${str(manifest.name)} — ${
                str(object(chapter).name) || i + 1
              }`,
              source: manifest.source,
              edition: manifest.edition,
            },
            `${kind}[${index}].data[${i}]`,
            materialPage,
            [str(manifest.id), String(i)]
          )
        );
      });
  }

  if (enabled("optionalfeature"))
    array(root.optionalfeature)
      .map(object)
      .forEach((row, i) => {
        if (
          !usedOptionals.has(
            canonicalKey(
              "optionalfeature",
              str(row.name),
              str(row.source),
              effectiveEdition(row.edition, meta.edition)
            )
          )
        )
          issues.push(
            issue(
              "OPTIONAL_FEATURE_WITHOUT_OWNER",
              `optionalfeature[${i}]`,
              "warning",
              "Прив'яжіть особливість до вибору класу або використовуйте її опис вручну"
            )
          );
      });

  for (const entry of entries)
    for (const warning of issues) {
      if (entry.issues.includes(warning)) continue;

      if (
        warning.path.startsWith(`${entry.key}.`) ||
        (entry.inputPath && warning.path.startsWith(`${entry.inputPath}.`))
      )
        entry.issues.push(warning);
    }

  if (entries.length > COMPENDIUM_LIMITS.selected)
    throw Error("SELECTED_RECORDS");

  embedded.optionalfeature = usedOptionals.size;

  return { entries, issues, sources, embedded, blocked };
}
