import { GRIM_ROW_KINDS, type GrimData, type GrimRowKind, type NamedProfile, type Row } from "./data";

import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { coerceRecord, IMPORT_SPECS, nameKey } from "@/lib/utils/content/import";
import { mergeRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";
import { SpeciesProfileSchema } from "@/lib/utils/rules/systems/schemas";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

export type GrimValidation = { ok: true } | { ok: false; issues: string[] };

const label = (kind: string, index: number, name: unknown) => `${kind} #${index + 1}${typeof name === "string" ? ` "${name}"` : ""}`;

const nameOf = (row: Row) => (typeof row.name === "string" ? row.name.trim() : undefined);

function validateRows(kind: GrimRowKind, rows: Row[], issues: string[]) {
  const spec = IMPORT_SPECS[kind];

  const schema = CONTENT_RESOURCES[kind].schemas.create;

  const seen = new Set<string>();

  rows.forEach((raw, index) => {
    const where = label(kind, index, raw.name);

    const { value: record, issues: coerced } = coerceRecord(raw, spec.fields);

    for (const i of coerced) issues.push(`${where}: ${i.field ?? ""} ${i.message}`.replace(/\s+/g, " "));

    const name = nameOf(record);

    if (!name) return void issues.push(`${where}: name is required`);

    if (seen.has(nameKey(name))) issues.push(`${where}: duplicate name`);

    seen.add(nameKey(name));

    const resolved = Object.fromEntries(Object.entries(record).filter(([key]) => !spec.fields.find((f) => f.key === key)?.ref));

    const parsed = schema.safeParse(spec.toBody ? spec.toBody(resolved, "create") : resolved);

    if (!parsed.success) for (const i of parsed.error.issues) issues.push(`${where}: ${i.path.join(".") || "row"} ${i.message}`);
  });
}

const isGrimKind = (kind: string | undefined): kind is GrimRowKind => (GRIM_ROW_KINDS as readonly string[]).includes(kind ?? "");

function nestedNames(value: unknown, key: string): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => nestedNames(v, key));

  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([k, v]) => (k === key && typeof v === "string" ? [v] : nestedNames(v, key)));
}

/** Links between row kinds are by name; a name missing from its kind is dropped (or errors) at import, so every one must resolve. */
function validateLinks(data: GrimData, issues: string[]) {
  const names = Object.fromEntries(GRIM_ROW_KINDS.map((kind) => [kind, new Set(data[kind].map((r) => nameKey(nameOf(r) ?? "")))])) as Record<GrimRowKind, Set<string>>;

  for (const kind of GRIM_ROW_KINDS)
    data[kind].forEach((row, index) => {
      const { value } = coerceRecord(row, IMPORT_SPECS[kind].fields);

      for (const field of IMPORT_SPECS[kind].fields) {
        const raw = value[field.key];

        const links = field.nestedRef && isGrimKind(field.nestedRef.kind) ? [{ ref: field.nestedRef.kind, names: nestedNames(raw, field.nestedRef.key) }] : isGrimKind(field.ref) ? [{ ref: field.ref, names: (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String) }] : [];

        for (const { ref, names: linked } of links) for (const name of linked) if (!names[ref].has(nameKey(name))) issues.push(`${label(kind, index, row.name)}: unknown ${field.key} "${name}"`);
      }
    });
}

function validateProfiles(data: GrimData, names: { races: Set<string>; careers: Set<string>; feats: Set<string> }, issues: string[]) {
  const seen = new Set<string>();

  data.raceProfiles.forEach(({ race, profile }, index) => {
    const where = `race-profiles #${index + 1} "${race}"`;

    if (!names.races.has(nameKey(race))) issues.push(`${where}: unknown race`);

    if (seen.has(nameKey(race))) issues.push(`${where}: duplicate profile`);

    seen.add(nameKey(race));

    const fakeId = (kind: "career" | "feat", set: Set<string>, name: string) => {
      if (!set.has(nameKey(name))) issues.push(`${where}: unknown ${kind} "${name}"`);

      return `${kind}:${nameKey(name)}`;
    };

    const named = profile as NamedProfile;

    const resolved = {
      ...named,
      talents: (named.talents ?? []).map((t) => fakeId("feat", names.feats, t)),
      randomTalents: (named.randomTalents ?? []).map((r) => ({ ...r, featId: fakeId("feat", names.feats, r.featId) })),
      careerTable: (named.careerTable ?? []).map((r) => ({ ...r, careerId: fakeId("career", names.careers, r.careerId) })),
    };

    const parsed = SpeciesProfileSchema.safeParse(resolved);

    if (!parsed.success) for (const i of parsed.error.issues) issues.push(`${where}: ${i.path.join(".") || "profile"} ${i.message}`);
  });
}

function validateRules(rules: GrimData["rules"], issues: string[]) {
  if (!rules) return;

  const patch = RulesetPatchSchema.safeParse(rules);

  if (!patch.success) return void patch.error.issues.forEach((i) => issues.push(`rules: ${i.path.join(".")} ${i.message}`));

  const merged = mergeRules(WFRP_RULES, patch.data as Parameters<typeof mergeRules>[1]);

  if (!merged.ok) merged.issues.forEach((i) => issues.push(`rules: ${i.path.join(".")} ${i.message}`));
}

export function validateGrimData(data: GrimData): GrimValidation {
  const issues: string[] = [];

  for (const kind of GRIM_ROW_KINDS) validateRows(kind, data[kind], issues);

  const names = { races: new Set(data.races.map((r) => nameKey(nameOf(r) ?? ""))), careers: new Set(data.careers.map((r) => nameKey(nameOf(r) ?? ""))), feats: new Set(data.feats.map((r) => nameKey(nameOf(r) ?? ""))) };

  validateLinks(data, issues);
  validateProfiles(data, names, issues);
  validateRules(data.rules, issues);

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
