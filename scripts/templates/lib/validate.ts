import { PACK_ADAPTERS, PACK_HOOKS, type PackIssue, SYSTEM_MODULE } from "../systems";
import { catalogOfPack, i18nIssuesOf } from "./i18n-convert";
import { readTranslations } from "./i18n-store";
import { iconGaps, iconIssues } from "./icons-file";
import { type Pack, type PackRow, TEMPLATES_DIR } from "./pack";

import { TemplateManifestSchema } from "@/lib/schemas/template-manifest";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { coerceRecord, IMPORT_SPECS, isImportKind, nameKey } from "@/lib/utils/content/import";
import { RulesetSchema } from "@/lib/utils/rules/schema";
import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems/registry";
import { statusOf } from "@/lib/utils/templates/i18n/keys";
import type { PackKind, TemplateManifest } from "@/lib/utils/templates/manifest";
import { TEMPLATE_REGISTRY } from "@/lib/utils/templates/registry";
import { isSlug } from "@/lib/utils/templates/slug";
import type { ImportKind } from "@/types/content-import";

export interface ValidateOptions {
  registry?: Readonly<Record<string, TemplateManifest>>;
  dir?: string;
}

const error = (message: string, extra: Partial<PackIssue> = {}): PackIssue => ({ level: "error", message, ...extra });

const label = (kind: string, index: number, name: unknown) => `${kind} #${index + 1}${typeof name === "string" ? ` "${name}"` : ""}`;

const nameOf = (row: Record<string, unknown>) => (typeof row.name === "string" ? row.name.trim() : undefined);

function manifestIssues(pack: Pack, registry: Readonly<Record<string, TemplateManifest>>): PackIssue[] {
  const { manifest } = pack;

  const parsed = TemplateManifestSchema.safeParse(manifest);

  const issues = parsed.success ? [] : parsed.error.issues.map((i) => error(`manifest: ${i.path.join(".") || "manifest"} ${i.message}`));

  if (!Object.hasOwn(RULE_SYSTEM_REGISTRY, manifest.system)) issues.push(error(`manifest: system "${manifest.system}" is not a known rule system`));

  for (const { from } of manifest.include ?? []) {
    const source = Object.hasOwn(registry, from) ? registry[from] : undefined;

    if (!source) issues.push(error(`manifest: include.from "${from}" is not a known pack`));
    else if (SYSTEM_MODULE[source.system] !== SYSTEM_MODULE[manifest.system]) issues.push(error(`manifest: include.from "${from}" belongs to system "${source.system}", a different module than "${manifest.system}"`));
  }

  return issues;
}

function rulesIssues(pack: Pack): PackIssue[] {
  const parsed = RulesetSchema.safeParse(pack.rules);

  if (!parsed.success) return parsed.error.issues.map((i) => error(`rules: ${i.path.join(".") || "rules"} ${i.message}`));

  return parsed.data.system.key === pack.manifest.system ? [] : [error(`rules: system.key "${parsed.data.system.key}" does not match manifest system "${pack.manifest.system}"`)];
}

function rowIssues(kind: PackKind, rows: PackRow[]): PackIssue[] {
  const issues: PackIssue[] = [];

  const seenNames = new Map<string, string>();

  const slugs = new Map<string, string>();

  rows.forEach((raw, index) => {
    const where = label(kind, index, raw.name);

    const at = { kind, slug: typeof raw.slug === "string" ? raw.slug : undefined };

    const add = (message: string) => issues.push(error(`${where}: ${message}`, at));

    if (typeof raw.slug !== "string" || !isSlug(raw.slug)) add("invalid slug");
    else if (slugs.has(raw.slug)) add(`duplicate slug "${raw.slug}" (also ${slugs.get(raw.slug)})`);
    else slugs.set(raw.slug, String(raw.name ?? raw.slug));

    if (!isImportKind(kind)) return;

    const { slug: _slug, origin: _origin, ...fields } = raw;

    const spec = IMPORT_SPECS[kind];

    const { value: record, issues: coerced } = coerceRecord(fields, spec.fields);

    for (const i of coerced) add(`${i.field ?? ""} ${i.message}`.replace(/\s+/g, " ").trim());

    const name = nameOf(record);

    if (!name) return add("name is required");

    if (seenNames.has(nameKey(name))) add("duplicate name");

    seenNames.set(nameKey(name), name);

    const resolved = Object.fromEntries(Object.entries(record).filter(([key]) => !spec.fields.find((f) => f.key === key)?.ref));

    const parsed = CONTENT_RESOURCES[kind].schemas.create.safeParse(spec.toBody ? spec.toBody(resolved, "create") : resolved);

    if (!parsed.success) for (const i of parsed.error.issues) add(`${i.path.join(".") || "row"} ${i.message}`);
  });

  return issues;
}

function nestedNames(value: unknown, key: string): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => nestedNames(v, key));

  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([k, v]) => (k === key && typeof v === "string" ? [v] : nestedNames(v, key)));
}

const exactName = (row: PackRow) => (typeof row.name === "string" ? row.name : "");

/** Links between row kinds are by name and must resolve inside the pack, matching the name exactly. */
function linkIssues(pack: Pack): PackIssue[] {
  const kinds = (Object.keys(pack.rows) as PackKind[]).filter(isImportKind);

  const names = new Map<ImportKind, Set<string>>(kinds.map((kind) => [kind, new Set((pack.rows[kind] ?? []).map(exactName))]));

  return kinds.flatMap((kind) =>
    (pack.rows[kind] ?? []).flatMap((row, index) => {
      const { slug: _slug, origin: _origin, ...fields } = row;

      const { value } = coerceRecord(fields, IMPORT_SPECS[kind].fields);

      return IMPORT_SPECS[kind].fields.flatMap((field) => {
        const raw = value[field.key];

        const links = field.nestedRef ? [{ ref: field.nestedRef.kind, linked: nestedNames(raw, field.nestedRef.key) }] : field.ref ? [{ ref: field.ref, linked: (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String) }] : [];

        return links.flatMap(({ ref, linked }) => linked.filter((name) => !names.get(ref)?.has(name)).map((name) => error(`${label(kind, index, row.name)}: unknown ${field.key} "${name}"`, { kind, slug: row.slug })));
      });
    }),
  );
}

function countIssues(pack: Pack): PackIssue[] {
  const { counts, kinds } = pack.manifest;

  return [
    ...kinds.flatMap((kind) => ((counts[kind] ?? 0) === (pack.rows[kind]?.length ?? 0) ? [] : [error(`manifest: counts.${kind} is ${counts[kind] ?? "missing"}, the pack has ${pack.rows[kind]?.length ?? 0} rows`)])),
    ...(Object.keys(counts) as PackKind[]).filter((kind) => !kinds.includes(kind)).map((kind) => error(`manifest: counts.${kind} is set but "${kind}" is not in kinds`)),
  ];
}

function iconPackIssues(pack: Pack): PackIssue[] {
  const rows = pack.rows as Record<string, { slug?: unknown }[]>;

  return [...iconIssues(rows, pack.icons).map((message) => error(message)), ...iconGaps(rows, pack.icons).map((message): PackIssue => ({ level: "warning", message }))];
}

function translationIssues(pack: Pack, dir: string): PackIssue[] {
  const catalog = catalogOfPack(pack);

  return pack.manifest.locales.filter((locale) => locale !== "en").flatMap((locale) => {
    const tr = readTranslations(pack.manifest.key, locale, dir);

    const status = statusOf(catalog, tr);

    const gaps = status.stale.length + status.missing.length;

    return [
      ...status.orphan.map((key) => error(`i18n ${locale}: orphan key "${key}"`)),
      ...i18nIssuesOf(pack, tr).map((message) => error(`i18n ${locale}: ${message}`)),
      ...(gaps > 0 ? [{ level: "warning" as const, message: `i18n ${locale}: stale ${status.stale.length}, missing ${status.missing.length}` }] : []),
    ];
  });
}

export function validatePack(pack: Pack, opts: ValidateOptions = {}): PackIssue[] {
  const { registry = TEMPLATE_REGISTRY, dir = TEMPLATES_DIR } = opts;

  const hooks = Object.hasOwn(PACK_HOOKS, pack.manifest.system) ? PACK_HOOKS[pack.manifest.system] : undefined;

  const adapter = Object.hasOwn(PACK_ADAPTERS, pack.manifest.key) ? PACK_ADAPTERS[pack.manifest.key] : undefined;

  const early = [...manifestIssues(pack, registry), ...rulesIssues(pack)];

  if (early.length > 0) return early;

  return [
    ...(Object.entries(pack.rows) as [PackKind, PackRow[]][]).flatMap(([kind, rows]) => rowIssues(kind, rows)),
    ...linkIssues(pack),
    ...countIssues(pack),
    ...iconPackIssues(pack),
    ...translationIssues(pack, dir),
    ...(hooks?.validatePack?.(pack) ?? []),
    ...(adapter?.validate?.(pack) ?? []),
  ];
}
