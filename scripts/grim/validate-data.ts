import { GRIM_ROW_KINDS, type GrimData, type GrimRowKind, type NamedProfile, type Row } from "./data";

import { CAREER_TIER_COUNT, careerTierKey } from "@/lib/constants/import-aliases";
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

function careerTalentNames(row: Row): string[] {
  const { value } = coerceRecord(row, IMPORT_SPECS.careers.fields);

  return Array.from({ length: CAREER_TIER_COUNT }, (_, i) => value[careerTierKey(i + 1, "talents")]).flatMap((v) => (Array.isArray(v) ? v.map(String) : []));
}

function validateCareerTalents(data: GrimData, feats: Set<string>, issues: string[]) {
  data.careers.forEach((row, index) => {
    for (const talent of careerTalentNames(row)) if (!feats.has(nameKey(talent))) issues.push(`${label("careers", index, row.name)}: unknown talent "${talent}"`);
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

  validateCareerTalents(data, names.feats, issues);
  validateProfiles(data, names, issues);
  validateRules(data.rules, issues);

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
