#!/usr/bin/env tsx
// pnpm srd:i18n extract <locale> [--phase A|B] [--max-chars 22000]
// pnpm srd:i18n apply <locale> <file.jsonl ...>
// pnpm srd:i18n status <locale>
import * as fs from "fs";
import * as path from "path";

import { readSrdData } from "../lib/data-files";
import { type AppliedLine, inPhase, mergeApplied, missing, type Phase, planBatches } from "./batches";
import { extractCatalog } from "./catalog";
import { I18N_DIR, readTranslations, writeTranslations } from "./store";

const arg = (args: string[], name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const todoDir = (locale: string) => path.join(I18N_DIR, "todo", locale);

const jsonl = (rows: unknown[]) => `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`;

function extract(locale: string, args: string[]) {
  const phase = arg(args, "--phase") ?? "A";

  if (phase !== "A" && phase !== "B") throw new Error(`--phase має бути A або B, отримано: ${phase}`);

  const maxChars = Number(arg(args, "--max-chars") ?? 22000);

  const todo = missing(extractCatalog(readSrdData()), readTranslations(locale)).filter((e) => inPhase(e, phase as Phase));

  const dir = todoDir(locale);

  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (/^\d+(\.out)?\.jsonl$/.test(f)) fs.rmSync(path.join(dir, f));

  fs.mkdirSync(dir, { recursive: true });

  const batches = planBatches(todo, maxChars);

  batches.forEach((batch, i) => fs.writeFileSync(path.join(dir, `${String(i + 1).padStart(2, "0")}.jsonl`), jsonl(batch.map((e) => ({ h: e.hash, c: e.cls, en: e.en })))));

  console.info(`${locale} фаза ${phase}: ${todo.length} рядків, ${todo.reduce((n, e) => n + e.en.length, 0)} симв., ${batches.length} порцій → ${dir}`);
}

function parseLine(file: string, line: number, text: string): AppliedLine {
  try {
    return JSON.parse(text) as AppliedLine;
  } catch {
    throw new Error(`${file}:${line}: некоректний JSONL`);
  }
}

function apply(locale: string, files: string[]) {
  const lines: AppliedLine[] = files.flatMap((f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l, i) => parseLine(f, i + 1, l)));

  const { merged, accepted, rejected } = mergeApplied(readTranslations(locale), lines, extractCatalog(readSrdData()));

  writeTranslations(locale, merged);

  if (rejected.length > 0) {
    fs.mkdirSync(todoDir(locale), { recursive: true });
    fs.appendFileSync(path.join(todoDir(locale), "rejected.jsonl"), jsonl(rejected));
  }

  console.info(`прийнято ${accepted}, відхилено ${rejected.length}${rejected.length ? ` (todo/${locale}/rejected.jsonl; повторити через extract)` : ""}`);
}

function status(locale: string) {
  const tr = readTranslations(locale);

  const rows = new Map<string, { done: number; total: number; doneChars: number; chars: number }>();

  for (const e of extractCatalog(readSrdData())) {
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

const [command, locale, ...rest] = process.argv.slice(2);

if (!locale) throw new Error("Потрібна мова: pnpm srd:i18n <extract|apply|status> <locale>");

if (command === "extract") extract(locale, rest);
else if (command === "apply") apply(locale, rest);
else if (command === "status") status(locale);
else throw new Error(`Невідома команда: ${command}`);
