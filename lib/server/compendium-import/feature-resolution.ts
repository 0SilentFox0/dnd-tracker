/* eslint-disable no-restricted-syntax -- derived content written to the DB stays Ukrainian (spec part5, decision 5) */
import { array, effectiveEdition, object, str, unsupported } from "./adapters/shared";
import { renderEntries } from "./entries";
import { canonicalKey, nestedId } from "./identity";
import { type Compendium, type JsonRecord, normalized } from "./parse";
import { type AdapterContext, type Edition, type ImportIssue, issue } from "./types";

import { CHOICE_LIMITS } from "@/lib/constants/choices";

export interface FeatureResolutionContext {
  root: Compendium;
  editionFallback: unknown;
  issues: ImportIssue[];
  embedded: Record<string, number>;
  usedOptionals: Set<string>;
}

type Kind = "classFeature" | "subclassFeature";

interface FeatureScope {
  context: FeatureResolutionContext;
  ownerPath: string;
  featureContext: AdapterContext;
}

// 5etools: an empty class/subclass source in a UID means the edition's default source.
const defaultSource = (edition: Edition) => edition === "one" ? "xphb" : "phb";

function findFeatureRows(root: Compendium, kind: Kind, parts: string[], edition: Edition): JsonRecord[] {
  const fallback = defaultSource(edition);

  const sourceOf = (part: string | undefined) => part ? normalized(part) : fallback;

  const levelAt = kind === "classFeature" ? 3 : 5;

  const sourceAt = kind === "classFeature" ? 4 : 6;

  return array(root[kind]).map(object).filter((r) =>
    normalized(str(r.name)) === normalized(parts[0] ?? "") &&
    normalized(str(r.className)) === normalized(parts[1] ?? "") &&
    normalized(str(r.classSource)) === sourceOf(parts[2]) &&
    (kind !== "subclassFeature" || (normalized(str(r.subclassShortName)) === normalized(parts[3] ?? "") && normalized(str(r.subclassSource)) === sourceOf(parts[4]))) &&
    Number(r.level) === Number(parts[levelAt]) &&
    (!parts[sourceAt] || normalized(str(r.source)) === normalized(parts[sourceAt])));
}

const ABILITY_SHORT: Record<string, string> = { str: "Сила", dex: "Спритність", con: "Статура", int: "Інтелект", wis: "Мудрість", cha: "Харизма" };

function prerequisiteText(raw: unknown): string {
  return (Array.isArray(raw) ? raw : [raw]).map(object).map((alt) => {
    const parts: string[] = [];

    const level = alt.level;

    if (typeof level === "number") parts.push(`рівень ${level}+`);
    else if (level && typeof level === "object") {
      const l = object(level);

      const who = [str(object(l.class).name), str(object(l.subclass).name)].filter(Boolean).join(", ");

      parts.push([typeof l.level === "number" ? `рівень ${l.level}+` : "", who].filter(Boolean).join(" "));
    }

    for (const row of array(alt.ability).map(object)) {
      parts.push(Object.entries(row).map(([k, v]) => `${ABILITY_SHORT[k] ?? k} ${String(v)}+`).join(" або "));
    }

    for (const o of array(alt.other)) if (typeof o === "string" && o) parts.push(o);

    const rest = Object.keys(alt).filter((k) => !["level", "ability", "other"].includes(k));

    if (rest.length > 0) parts.push(rest.join(", "));

    return parts.filter(Boolean).join(", ");
  }).filter(Boolean).join("; ");
}

function optionFromRow(context: FeatureResolutionContext, featureContext: AdapterContext, row: JsonRecord): JsonRecord {
  const name = str(row.name);

  const source = str(row.source);

  context.usedOptionals.add(canonicalKey("optionalfeature", name, source, effectiveEdition(row.edition, context.editionFallback)));

  return {
    id: nestedId(`${name}|${source}`),
    name,
    description: [
      renderEntries(row.entries).text,
      unsupported(row, ["prerequisite", "featureType"], featureContext),
      prerequisiteText(row.prerequisite) ? `Вимоги (ДМ перевіряє вручну): ${prerequisiteText(row.prerequisite)}` : "",
    ].filter(Boolean).join("\n"),
    abilities: [],
  };
}

function resolveOptional({ context, ownerPath, featureContext }: FeatureScope, v: JsonRecord): JsonRecord | undefined {
  const { root, issues } = context;

  const uid = str(v.optionalfeature);

  const [name, source] = uid.split("|");

  const candidates = array(root.optionalfeature).map(object).filter((r) => normalized(str(r.name)) === normalized(name) && normalized(str(r.source)) === normalized(source ?? ""));

  if (candidates.length !== 1) {
    issues.push(issue("OPTIONAL_FEATURE_REF", ownerPath, "error"));

    return;
  }

  return { ...optionFromRow(context, featureContext, candidates[0]), id: nestedId(uid) };
}

function collectChoices(scope: FeatureScope, entries: unknown, parts: string[]): JsonRecord[] {
  const { ownerPath, context } = scope;

  const choices: JsonRecord[] = [];

  const visit = (v: unknown) => {
    if (Array.isArray(v)) {
      v.forEach(visit);

      return;
    }

    const o = object(v);

    if (o.type === "options") {
      const children = array(o.entries).map(object);

      if (children.length && children.every((child) => child.type === "refOptionalfeature") && Number.isInteger(o.count) && Number(o.count) > 0 && Number(o.count) <= children.length) {
        const options = children.flatMap((child) => resolveOptional(scope, child) ?? []);

        if (options.length === children.length) choices.push({ id: nestedId(`${ownerPath}:${JSON.stringify(parts)}:${choices.length}`), label: "Особливості на вибір", kind: "option", count: o.count, options });
      } else context.issues.push(issue("MANUAL_OPTIONAL_PROGRESSION", ownerPath, "warning", { variant: "ambiguous" }));

      return;
    }

    if (o.type === "refOptionalfeature") {
      const option = resolveOptional(scope, o);

      if (option) choices.push({ id: nestedId(`${ownerPath}:${JSON.stringify(parts)}:${choices.length}:${str(o.optionalfeature)}`), label: option.name, kind: "option", count: 1, options: [option] });

      return;
    }

    Object.values(o).forEach(visit);
  };

  visit(entries);

  return choices;
}

const REF_KEYS = { refSubclassFeature: "subclassFeature", refClassFeature: "classFeature" } as const;

// A child feature that the parent only references by UID is rendered inline as a named block.
function inlineFeatureRefs(context: FeatureResolutionContext, value: unknown, edition: Edition, depth = 0): unknown {
  const { root, embedded } = context;

  if (Array.isArray(value)) return value.map((v) => inlineFeatureRefs(context, v, edition, depth));

  if (!value || typeof value !== "object") return value;

  const o = value as JsonRecord;

  const kind = REF_KEYS[str(o.type) as keyof typeof REF_KEYS];

  if (kind && depth < 3) {
    const [child] = findFeatureRows(root, kind, str(o[kind]).split("|"), edition);

    if (!child) return value;

    embedded[kind] = (embedded[kind] ?? 0) + 1;

    return { type: "entries", name: str(child.name), entries: inlineFeatureRefs(context, child.entries, edition, depth + 1) };
  }

  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, inlineFeatureRefs(context, v, edition, depth)]));
}

function resolveFeature(context: FeatureResolutionContext, kind: Kind, ownerPath: string, i: number, parts: string[], row: JsonRecord): JsonRecord {
  const { root, editionFallback, issues, embedded } = context;

  embedded[kind] = (embedded[kind] ?? 0) + 1;
  issues.push(issue("MANUAL_CLASS_FEATURE", ownerPath, "warning"));

  const rendered = renderEntries(inlineFeatureRefs(context, row.entries, effectiveEdition(row.edition, editionFallback)), `${kind}.${i}`);

  const featureContext: AdapterContext = { root, inputKind: kind, path: ownerPath, source: str(row.source), edition: effectiveEdition(row.edition, editionFallback), key: ownerPath, issues };

  const featureNotes = unsupported(row, ["className", "classSource", "subclassShortName", "subclassSource", "level", "header"], featureContext);

  issues.push(...rendered.issues);

  const choices = collectChoices({ context, ownerPath, featureContext }, row.entries, parts);

  return {
    level: row.level,
    description: [str(row.name), rendered.text, featureNotes].filter(Boolean).join("\n"),
    abilities: [],
    ...(choices.length && { choices }),
  };
}

// Explicit feature UIDs include parent identities. No guessing by first matching display name.
export function resolveCompendiumFeatures(raw: unknown, kind: Kind, ownerPath: string, context: FeatureResolutionContext, ownerEdition?: Edition): JsonRecord[] {
  const edition = effectiveEdition(ownerEdition, context.editionFallback);

  const out: JsonRecord[] = [];

  for (const [i, ref] of array(raw).entries()) {
    const parts = (typeof ref === "string" ? ref : str(object(ref)[kind])).split("|");

    const candidates = findFeatureRows(context.root, kind, parts, edition);

    if (candidates.length !== 1) {
      context.issues.push(issue("FEATURE_REF_UNRESOLVED", `${ownerPath}[${i}]`, "error"));
      continue;
    }

    out.push(resolveFeature(context, kind, ownerPath, i, parts, candidates[0]));
  }

  return out;
}

export interface OptionalOwner {
  kind: "class" | "subclass";
  names: string[];
}

const levelRefs = (prerequisite: unknown) => (Array.isArray(prerequisite) ? prerequisite : [prerequisite]).map((p) => object(object(p).level)).filter((l) => l.class !== undefined || l.subclass !== undefined);

// A prerequisite naming another class/subclass means the option belongs to that owner.
function belongsTo(prerequisite: unknown, owner: OptionalOwner): boolean {
  const named = (r: unknown) => normalized(str(object(r).name));

  return levelRefs(prerequisite).every((l) => {
    if (owner.kind === "subclass") return l.subclass === undefined || owner.names.some((n) => normalized(n) === named(l.subclass));

    return l.class === undefined || named(l.class) === normalized(owner.names[0] ?? "");
  });
}

const progressionLevels = (progression: unknown): Array<[number, number]> =>
  (Array.isArray(progression) ? progression.map((c, i): [number, number] => [i + 1, Number(c)]) : Object.entries(object(progression)).map(([level, c]): [number, number] => [Number(level), Number(c)]))
    .filter(([level, count]) => Number.isInteger(level) && level >= 1 && level <= 20 && Number.isInteger(count) && count > 0)
    .sort((a, b) => a[0] - b[0]);

// 5etools `optionalfeatureProgression`: the owner picks N options of the matching `featureType`s by level; each increase becomes one choice feature.
export function resolveOptionalProgression(raw: unknown, ownerPath: string, context: FeatureResolutionContext, owner: OptionalOwner, ownerEdition?: Edition): JsonRecord[] {
  const edition = effectiveEdition(ownerEdition, context.editionFallback);

  const featureContext: AdapterContext = { root: context.root, inputKind: "optionalfeature", path: ownerPath, source: "", edition, key: ownerPath, issues: context.issues };

  const out: JsonRecord[] = [];

  for (const [p, entry] of array(raw).map(object).entries()) {
    const at = `${ownerPath}.optionalfeatureProgression[${p}]`;

    const types = new Set(array(entry.featureType).map(str));

    const label = str(entry.name) || "Особливості на вибір";

    const rows = array(context.root.optionalfeature).map(object).filter((r) => array(r.featureType).some((t) => types.has(str(t))) && belongsTo(r.prerequisite, owner) && (edition === "unknown" || effectiveEdition(r.edition, context.editionFallback) === edition));

    const levels = progressionLevels(entry.progression);

    if (rows.length === 0 || levels.length === 0 || rows.length > CHOICE_LIMITS.options) {
      context.issues.push(issue("MANUAL_OPTIONAL_PROGRESSION", at, "warning"));

      continue;
    }

    context.issues.push(issue("MANUAL_OPTIONAL_FEATURE", at, "warning"));

    const options = rows.map((r) => optionFromRow(context, featureContext, r));

    let previous = 0;

    for (const [level, total] of levels) {
      const count = Math.min(total - previous, options.length);

      previous = Math.max(previous, total);

      if (count > 0) out.push({ level, description: label, abilities: [], choices: [{ id: nestedId(`${ownerPath}:progression:${p}:${level}`), label, kind: "option", count, options }] });
    }
  }

  return out;
}
