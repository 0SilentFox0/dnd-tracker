import { renderEntries } from "../entries";
import { stableJson } from "../identity";
import type { JsonRecord } from "../parse";
import { type AdapterContext, type CompendiumRef, type Edition, issue } from "../types";

import { DND_SKILLS } from "@/lib/constants/skills";
import { isRecord } from "@/lib/utils/common/is-record";

export const effectiveEdition = (value: unknown, fallback: unknown): Edition =>
  value === "classic" || value === "one"
    ? value
    : fallback === "classic" || fallback === "one"
    ? fallback
    : "unknown";

export const object = (v: unknown): JsonRecord => isRecord(v) ? v : {};
export const array = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
export const str = (v: unknown): string => typeof v === "string" ? v : "";
export const num = (v: unknown): number | undefined => typeof v === "number" && Number.isFinite(v) ? v : undefined;
export const ABILITIES: Readonly<Record<string, string>> = { str: "strength", dex: "dexterity", con: "constitution", int: "intelligence", wis: "wisdom", cha: "charisma" };
export const SKILLS = Object.fromEntries(DND_SKILLS.map((s) => [s.toLowerCase(), s]));
export const skillName = (s: string): string | undefined => SKILLS[s.replace(/\s/g, "").toLowerCase()];

export function description(row: JsonRecord, ctx: AdapterContext): string {
  const rendered = renderEntries([row.entries, row.entriesHigherLevel], `${ctx.path}.entries`);

  ctx.issues.push(...rendered.issues);

  return rendered.text;
}

export function unsupported(row: JsonRecord, handled: readonly string[], ctx: AdapterContext): string {
  const common = new Set(["name", "source", "page", "edition", "additionalSources", "otherSources", "referenceSources", "alias", "entries", "entriesHigherLevel", ...handled]);

  const notes: string[] = [];

  for (const [field, value] of Object.entries(row)) {
    if (common.has(field)) continue;

    const media = /^(?:foundry|fluff|hasFluff|token|soundClip)/i.test(field);

    ctx.issues.push(issue(media ? "MEDIA_OR_FOUNDRY_SKIPPED" : "UNSUPPORTED_FIELD", `${ctx.path}.${field}`));

    if (!media) notes.push(`${field}: ${stableJson(value)}`);
  }

  return notes.join("\n");
}

export function skills(raw: unknown, ctx: AdapterContext): { fixed: string[]; choices: JsonRecord[] } {
  const fixed: string[] = [];

  const choices: JsonRecord[] = [];

  for (const [i, value] of array(raw).entries()) {
    const row = object(value);

    for (const [key, enabled] of Object.entries(row)) {
      if (enabled !== true) continue;

      const id = skillName(key);

      if (id) fixed.push(id);
      else ctx.issues.push(issue("MANUAL_CUSTOM_SKILL", `${ctx.path}.skillProficiencies[${i}].${key}`, "warning", "Ведіть нестандартну навичку вручну"));
    }

    const choose = object(row.choose);

    const count = num(row.any) ?? num(choose.count);

    const from = row.any !== undefined ? [...DND_SKILLS] : array(choose.from).flatMap((s) => typeof s === "string" && skillName(s) ? [skillName(s)] : []);

    if (count && from.length >= count) choices.push({ id: `import-skills-${i}`, label: "Навички", kind: "skill", count, skills: from });
  }

  return { fixed: [...new Set(fixed)], choices };
}

export function abilityChoices(raw: unknown, ctx: AdapterContext): JsonRecord[] {
  const variants = array(raw);

  if (variants.length !== 1) {
    if (variants.length) ctx.issues.push(issue("MANUAL_ABILITY_VARIANTS", `${ctx.path}.ability`));

    return [];
  }

  const row = object(variants[0]);

  const weighted = object(object(row.choose).weighted);

  const from = array(weighted.from).map((v) => ABILITIES[str(v)]).filter(Boolean);

  const weights = array(weighted.weights);

  if (from.length >= 2 && new Set(from).size === from.length && weights.length === 2 && [...weights].sort().join() === "1,2") return [{ id: "ability-scores", label: "Характеристики", kind: "abilityScore", count: 3, points: 3, abilities: from, maxPerAbility: 2, max: 20 }];

  const choose = object(row.choose);

  const pool = array(choose.from).map((v) => ABILITIES[str(v)]).filter(Boolean);

  const amount = num(choose.amount) ?? 1;

  const count = num(choose.count) ?? 1;

  if (Object.keys(row).length === 1 && pool.length > 0 && pool.length === array(choose.from).length && new Set(pool).size === pool.length && Number.isInteger(amount) && Number.isInteger(count) && amount >= 1 && count >= 1 && amount * count <= 4) return [{ id: "ability-scores", label: "Характеристики", kind: "abilityScore", count: 1, points: amount * count, abilities: pool, maxPerAbility: amount, max: 20 }];

  const fixed = Object.entries(row).filter(([k, v]) => ABILITIES[k] && typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 3);

  if (fixed.length && fixed.length === Object.keys(row).length) return fixed.map(([k, v]) => ({ id: `import-asi-${k}`, label: ABILITIES[k], kind: "abilityScore", count: v, points: v, abilities: [ABILITIES[k]], maxPerAbility: v, max: 20 }));

  ctx.issues.push(issue("MANUAL_ABILITY_RULE", `${ctx.path}.ability`));

  return [];
}

export function uidRef(uid: string, kind: string, path: (string | number)[], ctx: AdapterContext): CompendiumRef {
  const [name, source] = uid.split("|");

  return { path, kind, name, source: source ?? "", edition: ctx.edition };
}
