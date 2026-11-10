#!/usr/bin/env tsx
// pnpm srd:i18n extract <locale> [--phase A|B] [--max-chars 22000] [--template srd|grim]
// pnpm srd:i18n apply <locale> <file.jsonl ...>
// pnpm srd:i18n normalize <locale>   (re-run name/header autofix over existing translations)
// pnpm srd:i18n status <locale>
import * as fs from "fs";
import * as path from "path";

import { type AppliedLine, inPhase, mergeApplied, missing, type Phase, planBatches } from "./batches";
import { buildNameMap, namesIn } from "./names";
import { readGlossary, readTranslations, writeTranslations } from "./store";
import { type I18nTemplate, templateOf } from "./templates";

const arg = (args: string[], name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const todoDir = (template: I18nTemplate, locale: string) => path.join(template.dir, "todo", locale);

const jsonl = (rows: unknown[]) => `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`;

function extract(template: I18nTemplate, locale: string, args: string[]) {
  const phase = arg(args, "--phase") ?? "A";

  if (phase !== "A" && phase !== "B") throw new Error(`--phase має бути A або B, отримано: ${phase}`);

  const maxChars = Number(arg(args, "--max-chars") ?? 22000);

  const catalog = template.catalog();

  const translations = readTranslations(locale, template.dir);

  const names = buildNameMap(catalog, translations);

  const todo = missing(catalog, translations).filter((e) => inPhase(e, phase as Phase));

  const dir = todoDir(template, locale);

  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (/^\d+(\.jsonl|\.out\.jsonl|\.names\.json)$/.test(f)) fs.rmSync(path.join(dir, f));

  fs.mkdirSync(dir, { recursive: true });

  const batches = planBatches(todo, maxChars);

  batches.forEach((batch, i) => {
    const id = String(i + 1).padStart(2, "0");

    fs.writeFileSync(path.join(dir, `${id}.jsonl`), jsonl(batch.map((e) => ({ h: e.hash, c: e.cls, en: e.en }))));

    const found = namesIn(batch.filter((e) => e.cls === "d").map((e) => e.en), names);

    if (Object.keys(found).length > 0) fs.writeFileSync(path.join(dir, `${id}.names.json`), `${JSON.stringify(found, null, 1)}\n`);
  });

  console.info(`${locale} фаза ${phase}: ${todo.length} рядків, ${todo.reduce((n, e) => n + e.en.length, 0)} симв., ${batches.length} порцій → ${dir}`);
}

function parseLine(file: string, line: number, text: string): AppliedLine {
  try {
    return JSON.parse(text) as AppliedLine;
  } catch {
    throw new Error(`${file}:${line}: некоректний JSONL`);
  }
}

function apply(template: I18nTemplate, locale: string, files: string[]) {
  const lines: AppliedLine[] = files.flatMap((f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l, i) => parseLine(f, i + 1, l)));

  const { merged, accepted, rejected } = mergeApplied(readTranslations(locale, template.dir), lines, template.catalog(), readGlossary(locale, template.dir));

  const issues = template.issues(merged);

  if (issues.length > 0) {
    for (const issue of issues) console.error(issue);

    process.exitCode = 1;

    return;
  }

  writeTranslations(locale, merged, template.dir);

  if (rejected.length > 0) {
    fs.mkdirSync(todoDir(template, locale), { recursive: true });
    fs.appendFileSync(path.join(todoDir(template, locale), "rejected.jsonl"), jsonl(rejected));
  }

  console.info(`прийнято ${accepted}, відхилено ${rejected.length}${rejected.length ? ` (todo/${locale}/rejected.jsonl; повторити через extract)` : ""}`);
}

function normalize(template: I18nTemplate, locale: string) {
  const tr = readTranslations(locale, template.dir);

  const catalog = template.catalog();

  const { merged } = mergeApplied(tr, catalog.filter((e) => tr[e.hash] !== undefined).map((e) => ({ h: e.hash, t: tr[e.hash] })), catalog, readGlossary(locale, template.dir));

  const changed = Object.keys(merged).filter((h) => merged[h] !== tr[h]).length;

  writeTranslations(locale, merged, template.dir);

  console.info(`нормалізовано ${changed} рядків`);
}

function status(template: I18nTemplate, locale: string) {
  const tr = readTranslations(locale, template.dir);

  const rows = new Map<string, { done: number; total: number; doneChars: number; chars: number }>();

  for (const e of template.catalog()) {
    for (const kind of e.kinds) {
      const key = `${kind}/${e.cls}`;

      const row = rows.get(key) ?? { done: 0, total: 0, doneChars: 0, chars: 0 };

      row.total += 1;
      row.chars += e.en.length;

      if (tr[e.hash] !== undefined) {
        row.done += 1;
        row.doneChars += e.en.length;
      }

      rows.set(key, row);
    }
  }

  for (const [key, r] of [...rows].sort()) console.info(`${key.padEnd(20)} ${r.done}/${r.total} рядків, ${Math.round((100 * r.doneChars) / r.chars)}% симв.`);
}

const { template, rest: argv } = templateOf(process.argv.slice(2));

const [command, locale, ...rest] = argv;

if (!locale) throw new Error("Потрібна мова: pnpm srd:i18n <extract|apply|status> <locale>");

if (command === "extract") extract(template, locale, rest);
else if (command === "apply") apply(template, locale, rest);
else if (command === "normalize") normalize(template, locale);
else if (command === "status") status(template, locale);
else throw new Error(`Невідома команда: ${command}`);
