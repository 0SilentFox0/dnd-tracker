import { describe, expect, it } from "vitest";

import { NAMESPACES } from "../config";
import { localSource } from "../local-source";

type Tree = Record<string, unknown>;

const CYRILLIC = /[Ѐ-ӿ]/;

const MIN_REPORT_LENGTH = 12;

const ENGLISH_WORD = /[A-Za-z]{2,}/g;

/** Keys (`ns.path`) whose uk value may keep several Latin words: product names, D&D terms, code samples. */
const UK_LATIN_ALLOWLIST = new Set<string>([
  "common.app.name", // product name
  "rest.arcane.aria", // D&D feature name kept in English across the uk UI
  "ai.page.restHeading", // technical term
]);

/** Keys (`ns.path`) whose uk and en values are identical on purpose (names, formulas, shared terms). */
const IDENTICAL_ALLOWLIST = new Set<string>([
  "common.app.name", // product name
  "rest.arcane.aria", // D&D feature name kept in English across the uk UI
  "characterProfile.sheet.heroHp.total", // formula
  "abilityText.log.damage", // symbols and placeholders only
  "abilityText.log.heal", // symbols and placeholders only
  "battleLog.maneuver.damage", // symbols and placeholders only
]);

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") out[path] = value;
    else if (value && typeof value === "object") Object.assign(out, flatten(value as Tree, path));
  }

  return out;
}

function stripPlaceholders(value: string): string {
  let out = value;

  for (let i = 0; i < 4; i++) out = out.replace(/\{[^{}]*\}/g, " ");

  return out.replace(/<[^>]*>/g, " ");
}

async function load() {
  const entries = await Promise.all(NAMESPACES.map(async (ns) => [ns, flatten((await localSource.load("uk", ns)) as Tree), flatten((await localSource.load("en", ns)) as Tree)] as const));

  return entries.flatMap(([ns, uk, en]) => Object.keys(en).map((key) => ({ id: `${ns}.${key}`, uk: uk[key], en: en[key] })));
}

describe("untranslated strings", () => {
  it("en values contain no Cyrillic", async () => {
    const bad = (await load()).filter((m) => CYRILLIC.test(m.en)).map((m) => `${m.id}: ${m.en}`);

    expect(bad).toEqual([]);
  });

  it("uk values without Cyrillic have fewer than two English words", async () => {
    const bad = (await load())
      .filter((m) => m.uk !== undefined && !CYRILLIC.test(m.uk) && (stripPlaceholders(m.uk).match(ENGLISH_WORD)?.length ?? 0) >= 2 && !UK_LATIN_ALLOWLIST.has(m.id))
      .map((m) => `${m.id}: ${m.uk}`);

    expect(bad).toEqual([]);
  });

  it("identical uk/en values over 12 characters are on the allowlist", async () => {
    const same = (await load()).filter((m) => m.uk === m.en && stripPlaceholders(m.en).trim().length > MIN_REPORT_LENGTH && !IDENTICAL_ALLOWLIST.has(m.id)).map((m) => `${m.id}: ${m.en}`);

    expect(same).toEqual([]);
  });
});
