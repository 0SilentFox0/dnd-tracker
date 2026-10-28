import { Prisma } from "@prisma/client";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { FULL_ROW_TABLES, UPDATED_AT_TABLES } from "@/lib/server/assistant/digest";

const root = path.resolve(__dirname, "../../../..");

const SOURCE_DIRS = ["lib", "app", "scripts"];

const BIND_ALLOWLIST = new Set(["lib/server/show/deck-operations.ts"]);

const FIRST_GUARDED_MIGRATION = "20261108000000_assistant_intents";

const tables = Object.values(UPDATED_AT_TABLES);

const delegates = Object.keys(UPDATED_AT_TABLES).map(model => model[0].toLowerCase() + model.slice(1));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "__tests__") continue;

    const full = path.join(dir, name);

    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mjs)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }

  return out;
}

const sources = SOURCE_DIRS.flatMap(dir => walk(path.join(root, dir))).map(file => ({ file: path.relative(root, file), text: readFileSync(file, "utf8") }));

function balanced(text: string, open: number): string {
  const pair = { "(": ")", "{": "}" }[text[open] as "(" | "{"];

  let depth = 0;

  for (let i = open; i < text.length; i++) {
    if (text[i] === text[open]) depth++;
    else if (text[i] === pair && --depth === 0) return text.slice(open, i + 1);
  }

  return text.slice(open);
}

describe("updatedAt audit behind precondition stamps", () => {
  it("keeps the table whitelist aligned with the Prisma schema", () => {
    const models = Prisma.dmmf.datamodel.models;

    for (const [model, table] of Object.entries(UPDATED_AT_TABLES)) {
      const entry = models.find(m => m.name === model);

      expect(entry?.dbName, model).toBe(table);
      expect(entry?.fields.some(f => f.name === "updatedAt" && f.isUpdatedAt), model).toBe(true);
    }

    for (const table of FULL_ROW_TABLES) {
      const entry = models.find(m => m.dbName === table);

      expect(entry, table).toBeDefined();
      expect(entry?.fields.some(f => f.name === "updatedAt"), table).toBe(false);
    }
  });

  it("has no raw SQL UPDATE of a stamped table outside migrations", () => {
    const pattern = new RegExp(`UPDATE\\s+(?:ONLY\\s+)?(?:"?public"?\\.)?"?(${tables.join("|")})"?\\s`, "i");

    const offenders = sources.filter(({ text }) => /\$executeRaw/.test(text) && pattern.test(text)).map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("never writes updatedAt in data of stamped models except the deck bind", () => {
    const call = new RegExp(`\\.(?:${delegates.join("|")})\\.(?:update|updateMany|upsert)\\(`, "g");

    const offenders: string[] = [];

    for (const { file, text } of sources) {
      if (BIND_ALLOWLIST.has(file)) continue;

      for (const match of text.matchAll(call)) {
        const args = balanced(text, match.index + match[0].length - 1);

        for (const key of args.matchAll(/\b(?:data|update|create)\s*:\s*\{/g)) {
          if (/\bupdatedAt\s*:/.test(balanced(args, key.index + key[0].length - 1))) offenders.push(`${file}: ${match[0]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("detects the bind exception it allowlists", () => {
    const bind = sources.find(({ file }) => BIND_ALLOWLIST.has(file));

    expect(bind?.text).toMatch(/slideDeck\.update\([^)]*updatedAt: current\.updatedAt/);
  });

  it("requires newer migrations that UPDATE a stamped table to set updatedAt", () => {
    const dir = path.join(root, "prisma/migrations");

    const pattern = new RegExp(`UPDATE\\s+(?:ONLY\\s+)?(?:"?public"?\\.)?"?(${tables.join("|")})"?\\b[^;]*;`, "gi");

    const offenders: string[] = [];

    for (const name of readdirSync(dir).filter(entry => entry > FIRST_GUARDED_MIGRATION && statSync(path.join(dir, entry)).isDirectory())) {
      const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");

      for (const statement of sql.match(pattern) ?? []) if (!/"updatedAt"/.test(statement)) offenders.push(`${name}: ${statement.slice(0, 60)}`);
    }

    expect(offenders).toEqual([]);
  });
});
