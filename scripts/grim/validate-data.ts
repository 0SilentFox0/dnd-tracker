import { GRIM_ROW_KINDS, type GrimData, type GrimRowKind, type NamedProfile, type Row } from "./data";
import { findForbiddenTerms } from "./forbidden-terms";
import { unitIssues } from "./units";

import { CAREER_TIER_COUNT, careerTierKey } from "@/lib/constants/import-aliases";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { coerceRecord, IMPORT_SPECS, nameKey } from "@/lib/utils/content/import";
import { mergeRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";
import { SPEC_RE } from "@/lib/utils/rules/systems";
import { SpeciesProfileSchema } from "@/lib/utils/rules/systems/schemas";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import { skillDef } from "@/lib/utils/rules/systems/wfrp/skills/catalog";

export type GrimValidation = { ok: true } | { ok: false; issues: string[] };

const PROFILE_KEYS = ["mods", "move", "fate", "extraWounds", "talents", "randomTalentCount", "randomTalents", "careerTable"] as const;

const PROFILE_LISTS = ["talents", "randomTalents", "careerTable"] as const;

const FEAT_STATS = ["attackBonus", "maxHp", "initiative"];

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

const STATUS_RE = /^(brass|silver|gold)\s+[1-9]$/i;

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

const exactName = (row: Row) => (typeof row.name === "string" ? row.name : "");

/** Links between row kinds are by name; a name missing from its kind is dropped (or errors) at import, so every one must resolve, matching the catalog name exactly. */
function validateLinks(data: GrimData, issues: string[]) {
  const names = Object.fromEntries(GRIM_ROW_KINDS.map((kind) => [kind, new Set(data[kind].map(exactName))])) as Record<GrimRowKind, Set<string>>;

  for (const kind of GRIM_ROW_KINDS)
    data[kind].forEach((row, index) => {
      const { value } = coerceRecord(row, IMPORT_SPECS[kind].fields);

      for (const field of IMPORT_SPECS[kind].fields) {
        const raw = value[field.key];

        const links = field.nestedRef && isGrimKind(field.nestedRef.kind) ? [{ ref: field.nestedRef.kind, names: nestedNames(raw, field.nestedRef.key) }] : isGrimKind(field.ref) ? [{ ref: field.ref, names: (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String) }] : [];

        for (const { ref, names: linked } of links) for (const name of linked) if (!names[ref].has(name)) issues.push(`${label(kind, index, row.name)}: unknown ${field.key} "${name}"`);
      }
    });
}

function validateProfiles(data: GrimData, names: { races: Set<string>; careers: Set<string>; feats: Set<string> }, issues: string[]) {
  const seen = new Set<string>();

  data.raceProfiles.forEach(({ race, profile }, index) => {
    const where = `race-profiles #${index + 1} "${race}"`;

    if (!names.races.has(race)) issues.push(`${where}: unknown race`);

    if (seen.has(nameKey(race))) issues.push(`${where}: duplicate profile`);

    seen.add(nameKey(race));

    if (!isObject(profile)) return void issues.push(`${where}: profile must be an object`);

    const badList = PROFILE_LISTS.filter((key) => key in profile && !Array.isArray(profile[key]));

    for (const key of badList) issues.push(`${where}: profile "${key}" must be an array`);

    if (badList.length > 0) return;

    const fakeId = (kind: "career" | "feat", set: Set<string>, name: string) => {
      if (!set.has(name)) issues.push(`${where}: unknown ${kind} "${name}"`);

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

export function careerSkillIssue(value: string): string | null {
  const [key, spec] = value.split(":");

  const def = skillDef(key);

  if (!def) return "unknown skill";

  if (def.spec === "none") return spec === undefined ? null : "takes no specialisation";

  if (spec === undefined) return "needs a specialisation";

  if (def.spec === "fixed") return def.specs?.includes(spec) ? null : "unknown specialisation";

  return SPEC_RE.test(spec) ? null : "unknown specialisation";
}

function validateCareerTiers(data: GrimData, issues: string[]) {
  data.careers.forEach((row, index) => {
    const { value } = coerceRecord(row, IMPORT_SPECS.careers.fields);

    const where = label("careers", index, row.name);

    for (let n = 1; n <= CAREER_TIER_COUNT; n++) {
      const skills = value[careerTierKey(n, "skills")];

      for (const skill of Array.isArray(skills) ? skills.map(String) : []) {
        const issue = careerSkillIssue(skill);

        if (issue) issues.push(`${where}: ${careerTierKey(n, "skills")} "${skill}" ${issue}`);
      }

      const status = value[careerTierKey(n, "status")];

      if (typeof status === "string" && status !== "" && !STATUS_RE.test(status.trim())) issues.push(`${where}: ${careerTierKey(n, "status")} "${status}" is not "<Brass|Silver|Gold> <1-9>"`);
    }
  });
}

function validateProfileKeys(data: GrimData, issues: string[]) {
  data.raceProfiles.forEach(({ race, profile }, index) => {
    if (!isObject(profile)) return;

    for (const key of PROFILE_KEYS) if (!(key in profile)) issues.push(`race-profiles #${index + 1} "${race}": profile missing "${key}"`);
  });
}

function validateFeatAbilities(data: GrimData, issues: string[]) {
  data.feats.forEach((row, index) => {
    const abilities = Array.isArray(row.abilities) ? row.abilities : [];

    abilities.forEach((ability: unknown, n) => {
      const where = `${label("feats", index, row.name)}: abilities[${n}]`;

      const { trigger, effects } = (isObject(ability) ? ability : {}) as { trigger?: { event?: unknown }; effects?: unknown };

      if (trigger?.event !== "passive") issues.push(`${where}: only a passive trigger acts on a wfrp hero`);

      for (const effect of Array.isArray(effects) ? effects : []) {
        const { kind, stat } = (isObject(effect) ? effect : {}) as { kind?: unknown; stat?: unknown };

        if (kind !== "modifyStat" || typeof stat !== "string" || !FEAT_STATS.includes(stat)) issues.push(`${where}: only modifyStat on ${FEAT_STATS.join("/")} acts on a wfrp hero`);
      }
    });
  });
}

function stringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];

  if (Array.isArray(value)) return value.flatMap(stringLeaves);

  return value && typeof value === "object" ? Object.values(value).flatMap(stringLeaves) : [];
}

function validateTerms(data: GrimData, issues: string[]) {
  const scan = (where: string, value: unknown) => {
    const found = new Set(stringLeaves(value).flatMap(findForbiddenTerms));

    for (const term of found) issues.push(`${where}: forbidden term "${term}"`);
  };

  for (const kind of GRIM_ROW_KINDS) data[kind].forEach((row, index) => scan(label(kind, index, row.name), row));

  data.raceProfiles.forEach(({ race }, index) => scan(`race-profiles #${index + 1} "${race}"`, race));
}

function validateRules(rules: GrimData["rules"], issues: string[]) {
  if (!rules) return;

  const patch = RulesetPatchSchema.safeParse(rules);

  if (!patch.success) return void patch.error.issues.forEach((i) => issues.push(`rules: ${i.path.join(".")} ${i.message}`));

  const merged = mergeRules(WFRP_RULES, patch.data as Parameters<typeof mergeRules>[1]);

  if (!merged.ok) merged.issues.forEach((i) => issues.push(`rules: ${i.path.join(".")} ${i.message}`));
}

function validateUnits(data: GrimData, issues: string[]) {
  data.units.forEach((row, index) => {
    for (const issue of unitIssues(row)) issues.push(`${label("units", index, row.name)}: ${issue}`);
  });
}

export function validateGrimData(data: GrimData): GrimValidation {
  const issues: string[] = [];

  for (const kind of GRIM_ROW_KINDS) validateRows(kind, data[kind], issues);

  const names = { races: new Set(data.races.map(exactName)), careers: new Set(data.careers.map(exactName)), feats: new Set(data.feats.map(exactName)) };

  validateLinks(data, issues);
  validateProfiles(data, names, issues);
  validateRules(data.rules, issues);
  validateCareerTiers(data, issues);
  validateProfileKeys(data, issues);
  validateFeatAbilities(data, issues);
  validateUnits(data, issues);
  validateTerms(data, issues);

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
