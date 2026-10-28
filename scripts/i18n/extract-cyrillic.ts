#!/usr/bin/env tsx
// pnpm i18n:extract <dir|file>... — lists Cyrillic literals and prints a draft messages JSON; never edits sources
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import ts from "typescript";

const CYRILLIC = /[Ѐ-ӿ]/;

export interface Literal {
  file: string;
  line: number;
  text: string;
}

export function extractCyrillic(source: string, file: string): Literal[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  const found: Literal[] = [];

  const add = (node: ts.Node, text: string) => {
    if (CYRILLIC.test(text)) found.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: text.replace(/\s+/g, " ").trim() });
  };

  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) add(node, node.text);
    else if (ts.isTemplateExpression(node)) add(node, [node.head.text, ...node.templateSpans.map((s) => `\${…}${s.literal.text}`)].join(""));

    ts.forEachChild(node, visit);
  };

  visit(sf);

  return found;
}

function collect(path: string): string[] {
  if (statSync(path).isFile()) return [path];

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "__tests__" || entry.name === "node_modules") return [];

    const full = join(path, entry.name);

    return entry.isDirectory() ? collect(full) : [".ts", ".tsx"].includes(extname(full)) && !full.endsWith(".d.ts") ? [full] : [];
  });
}

function camel(name: string): string {
  const [head, ...rest] = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);

  return [head.charAt(0).toLowerCase() + head.slice(1), ...rest.map((p) => p.charAt(0).toUpperCase() + p.slice(1))].join("");
}

export function draftMessages(literals: Literal[]): Record<string, Record<string, string>> {
  const draft: Record<string, Record<string, string>> = {};

  for (const { file, text } of literals) {
    const group = (draft[camel(basename(file, extname(file)))] ??= {});

    group[String(Object.keys(group).length + 1)] = text;
  }

  return draft;
}

function main() {
  const targets = process.argv.slice(2);

  if (targets.length === 0) {
    console.error("usage: pnpm i18n:extract <dir|file>...");
    process.exit(1);
  }

  const literals = targets.flatMap(collect).flatMap((file) => extractCyrillic(readFileSync(file, "utf8"), file));

  for (const { file, line, text } of literals) console.info(`${file}:${line} → ${text}`);

  console.info(`\n${JSON.stringify(draftMessages(literals), null, 2)}`);
}

if (process.argv[1]?.endsWith("extract-cyrillic.ts")) main();
