/* eslint-disable no-restricted-syntax -- derived content written to the DB stays Ukrainian (spec part5, decision 5) */
import { nestedId } from "../identity";
import type { AdapterContext, CompendiumRef } from "../types";
import { ABILITIES, array, num, object, str, uidRef } from "./shared";

import type { AbilityKey } from "@/lib/constants/abilities";
import { CHOICE_LIMITS } from "@/lib/constants/choices";
import { schoolByCode } from "@/lib/constants/spell-groups";
import { isRecord } from "@/lib/utils/common/is-record";

interface SpellChoice { id: string; label: string; description?: string; level: number; count: number; kind: "option" | "spell"; options?: Array<Record<string, unknown>>; spells?: { lists: string[]; minLevel: number; maxLevel: number }; grant?: Record<string, unknown> }

type Grant = { uses: number; rest: "short" | "long"; dcAbility?: AbilityKey } | undefined;

export interface FeatSpells { choices: SpellChoice[]; refs: CompendiumRef[]; manual: unknown[] }

interface Builder { out: FeatSpells; ctx: AdapterContext; offset: number }

interface GroupOpts { shared?: boolean; atWill?: boolean }

const FILTER_KEYS = new Set(["level"]);

const levelOf = (key: string) => (/^\d+$/.test(key) ? Number(key) : 1);

function parseFilter(filter: string): { level?: number; extra: string[] } {
  const parts = filter.split("|").map((p) => p.split("="));

  const level = parts.find(([k]) => k === "level")?.[1];

  const extra = parts.filter(([k]) => !FILTER_KEYS.has(k)).map(([k, v]) => (k === "school" ? `школи: ${(v ?? "").split(";").map((c) => schoolByCode(c)?.name ?? c).join(", ")}` : `${k}: ${v ?? ""}`));

  return { level: level !== undefined && /^\d+$/.test(level) ? Number(level) : undefined, extra };
}

const nextIndex = (b: Builder) => b.offset + b.out.choices.length;

function optionsFor(b: Builder, uids: string[], level: number, grant: Grant, choiceIndex: number) {
  return uids.map((uid, j) => {
    const [name] = uid.split("|");

    const clean = uid.split("#")[0];

    b.out.refs.push(uidRef(clean, "spell", ["choices", choiceIndex, "options", j, "spells", 0, "spellId"], b.ctx));

    return { id: nestedId(clean), name: name.replace(/^./, (c) => c.toUpperCase()), abilities: [], spells: [{ level, spellId: clean.split("|")[0], ...(grant && { grant }) }] };
  });
}

function addNamed(b: Builder, label: string, uids: string[], count: number, level: number, grant: Grant) {
  if (uids.length === 0) return;

  const at = nextIndex(b);

  b.out.choices.push({ id: `import-spells-${at}`, label, level: 1, count: Math.min(count, uids.length, CHOICE_LIMITS.count), kind: "option", options: optionsFor(b, uids, level, grant, at) });
}

function addFilter(b: Builder, filter: string, level: number, grant: Grant) {
  const parsed = parseFilter(filter);

  if (parsed.level === undefined) {
    b.out.manual.push({ choose: filter });

    return;
  }

  const at = nextIndex(b);

  b.out.choices.push({ id: `import-spells-${at}`, label: `Заклинання ${parsed.level}-го кола`, ...(parsed.extra.length > 0 && { description: `Обмеження за описом риси (${parsed.extra.join("; ")}) рушій не перевіряє` }), level: 1, count: 1, kind: "spell", spells: { lists: [], minLevel: parsed.level, maxLevel: parsed.level }, ...(grant && { grant }) });

  if (parsed.extra.length > 0) b.out.manual.push({ choose: filter, unchecked: parsed.extra });
}

function addGroup(b: Builder, entries: unknown[], label: string, level: number, grant: Grant, opts: GroupOpts) {
  const named = entries.filter((e): e is string => typeof e === "string");

  const pickCount = opts.shared ? 1 : named.length;

  for (const e of entries) {
    if (typeof e === "string") continue;

    const choose = object(e).choose;

    if (typeof choose === "string") addFilter(b, choose, level, grant);
    else if (Array.isArray(object(choose).from)) addNamed(b, label, array(object(choose).from).map(str).filter(Boolean), num(object(choose).count) ?? 1, level, grant);
    else b.out.manual.push(e);
  }

  const cantrips = named.filter((n) => n.includes("#c"));

  if (opts.atWill && cantrips.length !== named.length) {
    b.out.manual.push({ atWill: named.filter((n) => !n.includes("#c")) });
    addNamed(b, label, cantrips, cantrips.length, level, undefined);

    return;
  }

  addNamed(b, label, named, pickCount, level, grant);
}

function addKnownPrepared(b: Builder, block: Record<string, unknown>, blockIndex: number) {
  for (const mode of ["known", "prepared"] as const) {
    for (const [levelKey, value] of Object.entries(object(block[mode]))) {
      if (Array.isArray(value)) addGroup(b, value, `Заклинання (блок ${blockIndex + 1})`, levelOf(levelKey), undefined, {});
      else b.out.manual.push({ [mode]: { [levelKey]: value } });
    }
  }
}

function addUsesGroups(b: Builder, useKey: "daily" | "rest", value: object, level: number, dc: AbilityKey | undefined) {
  for (const [countKey, list] of Object.entries(object(value))) {
    const m = /^(\d+)(e?)$/.exec(countKey);

    if (!m || !Array.isArray(list)) {
      b.out.manual.push({ [useKey]: { [countKey]: list } });
      continue;
    }

    const uses = Number(m[1]);

    if (uses < 1 || uses > CHOICE_LIMITS.grantUses) {
      b.out.manual.push({ [useKey]: { [countKey]: list } });
      continue;
    }

    const grant: Grant = { uses, rest: useKey === "daily" ? "long" : "short", ...(dc && { dcAbility: dc }) };

    addGroup(b, list, `Заклинання ${useKey === "daily" ? "раз на день" : "раз на відпочинок"}`, level, grant, { shared: m[2] !== "e" });
  }
}

function addInnate(b: Builder, block: Record<string, unknown>, dc: AbilityKey | undefined) {
  for (const [levelKey, byUse] of Object.entries(object(block.innate))) {
    const level = levelOf(levelKey);

    if (!isRecord(byUse)) {
      b.out.manual.push({ innate: { [levelKey]: byUse } });
      continue;
    }

    for (const [useKey, value] of Object.entries(byUse)) {
      if (useKey === "will" && Array.isArray(value)) addGroup(b, value, "Заклинання без обмежень", level, undefined, { atWill: true });
      else if ((useKey === "daily" || useKey === "rest") && value && typeof value === "object") addUsesGroups(b, useKey, value, level, dc);
      else b.out.manual.push({ innate: { [levelKey]: { [useKey]: value } } });
    }
  }
}

const HANDLED_BLOCK_KEYS = new Set(["ability", "innate", "known", "prepared"]);

/** additionalSpells → option/spell choices with grant policies; at-will leveled spells, expanded lists and schools filters are returned as `manual`/described. */
export function featSpells(raw: unknown, ctx: AdapterContext, offset: number): FeatSpells {
  const b: Builder = { out: { choices: [], refs: [], manual: [] }, ctx, offset };

  for (const [i, blockRaw] of array(raw).entries()) {
    const block = object(blockRaw);

    const dc = typeof block.ability === "string" ? (ABILITIES[block.ability] as AbilityKey | undefined) : undefined;

    for (const key of Object.keys(block)) if (!HANDLED_BLOCK_KEYS.has(key)) b.out.manual.push({ [key]: block[key] });

    addKnownPrepared(b, block, i);
    addInnate(b, block, dc);
  }

  return b.out;
}

/** Subrace/lineage option spells: only fixed spells fit an option, so pick-one groups and filters stay manual. */
export function lineageSpells(raw: unknown, ctx: AdapterContext): { spells: Array<Record<string, unknown>>; refs: CompendiumRef[]; manual: unknown[] } {
  const built = featSpells(raw, ctx, 0);

  const spells: Array<Record<string, unknown>> = [];

  const refs: CompendiumRef[] = [];

  const manual = [...built.manual];

  let cursor = 0;

  for (const choice of built.choices) {
    const options = choice.options ?? [];

    if (choice.kind === "option" && choice.count === options.length && spells.length + options.length <= CHOICE_LIMITS.optionSpells) {
      for (const o of options) {
        refs.push({ ...built.refs[cursor++], path: ["choices", 0, "options", 0, "spells", spells.length, "spellId"] });
        spells.push((o.spells as Array<Record<string, unknown>>)[0]);
      }
    } else {
      cursor += options.length;
      manual.push({ unsupportedGroup: choice.label });
    }
  }

  return { spells, refs, manual };
}
