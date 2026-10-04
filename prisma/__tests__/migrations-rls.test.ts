import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");

function readAllMigrationsSql(): string {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readFileSync(path.join(MIGRATIONS_DIR, entry.name, "migration.sql"), "utf8"))
    .join("\n");
}

function matchAll(sql: string, pattern: RegExp): Set<string> {
  return new Set([...sql.matchAll(pattern)].map((m) => m[1]));
}

describe("migrations RLS", () => {
  // Supabase Data API віддає таблиці public анонімному ключу, якщо RLS вимкнено
  it("кожна створена таблиця має ENABLE ROW LEVEL SECURITY", () => {
    const sql = readAllMigrationsSql();

    const created = matchAll(sql, /CREATE TABLE\s+"([^"]+)"/g);

    const secured = matchAll(sql, /ALTER TABLE\s+"([^"]+)"\s+ENABLE ROW LEVEL SECURITY/g);

    const missing = [...created].filter((table) => !secured.has(table));

    expect(created.size).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});
