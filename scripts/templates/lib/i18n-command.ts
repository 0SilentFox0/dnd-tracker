import * as fs from "fs";
import * as path from "path";

import { PACK_HOOKS } from "../systems";
import { type AppliedLine, inPhase, mergeApplied, missing, type Phase, planBatches } from "./batches";
import { catalogOf, convertV1, i18nIssuesOf } from "./i18n-convert";
import { readGlossary, readTranslations, writeTranslations } from "./i18n-store";
import { buildNameMap, namesIn } from "./names";
import { packPath, readPack, TEMPLATES_DIR } from "./pack";

import { type KeyedString, statusOf } from "@/lib/utils/templates/i18n/keys";

const arg = (args: string[], name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const todoDir = (key: string, locale: string, dir: string) => path.join(packPath(key, "i18n", dir), "todo", locale);

const jsonl = (rows: unknown[]) => `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`;

function extract(key: string, locale: string, args: string[], dir: string) {
  const phase = arg(args, "--phase") ?? "A";

  if (phase !== "A" && phase !== "B") throw new Error(`--phase must be A or B, got: ${phase}`);

  const maxChars = Number(arg(args, "--max-chars") ?? 22000);

  const catalog = catalogOf(key, dir);

  const translations = readTranslations(key, locale, dir);

  const names = buildNameMap(catalog, translations);

  const stale = new Set(statusOf(catalog, translations).stale);

  const todo = [...missing(catalog, translations), ...catalog.filter((e) => stale.has(e.key))].filter((e) => inPhase(e, phase as Phase));

  const out = todoDir(key, locale, dir);

  for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) if (/^\d+(\.jsonl|\.out\.jsonl|\.names\.json)$/.test(f)) fs.rmSync(path.join(out, f));

  fs.mkdirSync(out, { recursive: true });

  const batches = planBatches(todo, maxChars);

  batches.forEach((batch, i) => {
    const id = String(i + 1).padStart(2, "0");

    fs.writeFileSync(path.join(out, `${id}.jsonl`), jsonl(batch.map((e) => ({ key: e.key, c: e.cls, en: e.en }))));

    const found = namesIn(batch.filter((e) => e.cls === "d").map((e) => e.en), names);

    if (Object.keys(found).length > 0) fs.writeFileSync(path.join(out, `${id}.names.json`), `${JSON.stringify(found, null, 1)}\n`);
  });

  console.info(`${key} ${locale} phase ${phase}: ${todo.length} rows, ${todo.reduce((n, e) => n + e.en.length, 0)} chars, ${batches.length} batches -> ${out}`);
}

const normalizerOf = (key: string, dir: string) => {
  const { system } = readPack(key, dir).manifest;

  return Object.hasOwn(PACK_HOOKS, system) ? PACK_HOOKS[system].normalizeTranslation : undefined;
};

function parseLine(file: string, line: number, text: string): AppliedLine {
  try {
    return JSON.parse(text) as AppliedLine;
  } catch {
    throw new Error(`${file}:${line}: malformed JSONL`);
  }
}

function apply(key: string, locale: string, files: string[], dir: string) {
  const lines: AppliedLine[] = files.flatMap((f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l, i) => parseLine(f, i + 1, l)));

  const { merged, accepted, rejected } = mergeApplied(readTranslations(key, locale, dir), lines, catalogOf(key, dir), readGlossary(key, locale, dir), normalizerOf(key, dir));

  const issues = i18nIssuesOf(readPack(key, dir), merged);

  if (issues.length > 0) {
    for (const issue of issues) console.error(issue);

    process.exitCode = 1;

    return;
  }

  writeTranslations(key, locale, merged, dir);

  if (rejected.length > 0) {
    fs.mkdirSync(todoDir(key, locale, dir), { recursive: true });
    fs.appendFileSync(path.join(todoDir(key, locale, dir), "rejected.jsonl"), jsonl(rejected));
  }

  console.info(`accepted ${accepted}, rejected ${rejected.length}${rejected.length ? ` (todo/${locale}/rejected.jsonl; rerun extract)` : ""}`);
}

function normalize(key: string, locale: string, dir: string) {
  const tr = readTranslations(key, locale, dir);

  const catalog = catalogOf(key, dir);

  const { merged } = mergeApplied(tr, catalog.filter((e) => Object.hasOwn(tr, e.key)).map((e) => ({ key: e.key, text: tr[e.key].text })), catalog, readGlossary(key, locale, dir), normalizerOf(key, dir));

  const changed = Object.keys(merged).filter((k) => merged[k].text !== tr[k].text).length;

  writeTranslations(key, locale, merged, dir);

  console.info(`normalized ${changed} rows`);
}

function status(key: string, locale: string, dir: string) {
  const catalog = catalogOf(key, dir);

  const tr = readTranslations(key, locale, dir);

  const result = statusOf(catalog, tr);

  const byKey = new Map<string, KeyedString>(catalog.map((e) => [e.key, e]));

  const rows = new Map<string, { done: number; total: number }>();

  for (const e of catalog) {
    const row = rows.get(`${e.kind}/${e.cls}`) ?? { done: 0, total: 0 };

    row.total += 1;

    if (Object.hasOwn(tr, e.key)) row.done += 1;

    rows.set(`${e.kind}/${e.cls}`, row);
  }

  for (const [name, r] of [...rows].sort()) console.info(`${name.padEnd(24)} ${r.done}/${r.total}`);

  console.info(`ok ${result.ok.length}, stale ${result.stale.length}, missing ${result.missing.length}, orphan ${result.orphan.length}`);

  for (const k of result.stale.slice(0, 10)) console.info(`  stale ${k}: ${byKey.get(k)?.en.slice(0, 60)}`);

  if (result.stale.length > 0 || result.missing.length > 0) process.exitCode = 1;
}

/** One-off: v1 hash dictionary -> v2 keyed entries; `--from` is the v1 file (default: the current locale file). */
function convert(key: string, locale: string, args: string[], dir: string) {
  const from = arg(args, "--from") ?? path.join(packPath(key, "i18n", dir), `${locale}.json`);

  const v1 = JSON.parse(fs.readFileSync(from, "utf8")) as Record<string, unknown>;

  if (Object.values(v1).some((value) => typeof value !== "string")) throw new Error(`${from} is not a v1 dictionary`);

  const { v2, unmatched } = convertV1(catalogOf(key, dir), v1 as Record<string, string>);

  writeTranslations(key, locale, v2, dir);

  console.info(`${key} ${locale}: ${Object.keys(v1).length} v1 entries -> ${Object.keys(v2).length} v2 entries, ${unmatched.length} unmatched`);

  for (const hash of unmatched) console.info(`  unmatched ${hash}: ${v1[hash]}`);
}

export function i18nCommand(args: string[], dir = TEMPLATES_DIR): void {
  const [command, key, locale, ...rest] = args;

  if (!key || !locale) throw new Error("Usage: pnpm template i18n <extract|apply|normalize|status|convert> <key> <locale>");

  if (command === "extract") extract(key, locale, rest, dir);
  else if (command === "apply") apply(key, locale, rest, dir);
  else if (command === "normalize") normalize(key, locale, dir);
  else if (command === "status") status(key, locale, dir);
  else if (command === "convert") convert(key, locale, rest, dir);
  else throw new Error(`Unknown command: ${command}`);
}
