#!/usr/bin/env tsx
// One-off: turns API_ERRORS text values into errors.* keys, merges the texts into messages/uk and rewrites test literals
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "lib/constants/api-errors.ts";
const CLIENT_SHOWN: Record<string, string> = { YOUTUBE_URL_INVALID: "validation", ITEM_CONSUMABLE_CONFLICT: "validation" };
const TEMPLATE_PARAMS: Record<string, string> = {
  MAX_TRACKS_PER_CAMPAIGN: "max",
  MAX_SLIDES_PER_DECK: "max",
  MAX_DECKS_PER_CAMPAIGN: "max",
  TRACK_FORMATS_LABEL: "formats",
  MAX_TRACK_MB: "maxMb",
  MAX_SLIDE_MB: "maxMb",
};

const camel = (name: string) => name.toLowerCase().replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const icu = (text: string) => text.replace(/\{(base)\}/g, "'{$1}'");

interface Entry {
  name: string;
  ns: string;
  key: string;
  text: string;
  templated: boolean;
}

const lines = readFileSync(SOURCE, "utf8").split("\n");

const entries: Entry[] = [];

const rewritten = lines.map((line) => {
  const match = line.match(/^(\s+)([A-Z0-9_]+): (["`])(.*)\3,$/);

  if (!match || !/[Ѐ-ӿ]/.test(match[4])) return line;

  const [, indent, name, quote, raw] = match;

  let templated = false;

  const body = quote === "`" ? raw.replace(/\$\{(\w+)\}/g, (_, id: string) => ((templated = true), `{${TEMPLATE_PARAMS[id] ?? (() => { throw new Error(`no param for ${id}`); })()}}`)) : (JSON.parse(`"${raw}"`) as string);

  const ns = CLIENT_SHOWN[name] ?? "errors";

  const key = camel(name);

  entries.push({ name, ns, key, text: templated ? body : body, templated });

  return `${indent}${name}: "${ns}.${key}",`;
});

const keys = new Set<string>();

for (const e of entries) {
  const id = `${e.ns}.${e.key}`;

  if (keys.has(id) || e.key === "fields") throw new Error(`collision: ${id}`);

  keys.add(id);
}

for (const ns of new Set(entries.map((e) => e.ns))) {
  const path = `messages/uk/${ns}.json`;

  const json = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

  for (const e of entries.filter((x) => x.ns === ns)) {
    if (e.key in json) throw new Error(`exists in ${path}: ${e.key}`);

    json[e.key] = icu(e.text);
  }

  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}

writeFileSync(SOURCE, rewritten.join("\n"));

const byText = new Map<string, Entry[]>();

for (const e of entries.filter((x) => !x.templated)) byText.set(e.text, [...(byText.get(e.text) ?? []), e]);

const files = execSync("git ls-files '**/__tests__/**'", { encoding: "utf8" }).split("\n").filter((f) => /\.(ts|tsx)$/.test(f));

const unresolved: string[] = [];

for (const file of files) {
  let src = readFileSync(file, "utf8");

  const used = new Set<string>();

  for (const [text, list] of byText) {
    if (list.length > 1) {
      if (src.includes(text)) unresolved.push(`${file}: ambiguous text "${text}" -> ${list.map((x) => x.name).join(",")}`);

      continue;
    }

    const quoted = [`"${text.replace(/"/g, '\\"')}"`, `'${text}'`];

    for (const q of quoted) {
      if (src.includes(q)) {
        src = src.split(q).join(`API_ERRORS.${list[0].name}`);
        used.add(list[0].name);
      }
    }
  }

  if (!used.size) continue;

  if (!/\bAPI_ERRORS\b[^;]*from "@\/lib\/constants\/api-errors"|import \{[^}]*API_ERRORS[^}]*\} from "@\/lib\/constants\/api-errors"/s.test(src)) {
    const existing = src.match(/import \{([^}]*)\} from "@\/lib\/constants\/api-errors";/);

    if (existing) src = src.replace(existing[0], `import {${existing[1].trimEnd()}, API_ERRORS } from "@/lib/constants/api-errors";`);
    else {
      const firstImport = src.search(/^import /m);

      const insert = `import { API_ERRORS } from "@/lib/constants/api-errors";\n`;

      src = firstImport === -1 ? insert + src : src.slice(0, firstImport) + insert + src.slice(firstImport);
    }
  }

  writeFileSync(file, src);
}

for (const e of entries.filter((x) => x.templated)) console.info(`templated: ${e.name} -> ${e.text}`);

for (const line of unresolved) console.info(line);
