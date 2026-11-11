import { ESLint } from "eslint";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { isImportAllowed, readImportsExempt, ROOT, scanImporters, SYSTEM_ROOTS } from "@/scripts/shared/system-ratchet";

const REASON = /^(route|content-kind|ruleset-section|e1:\d+\.\d+)$/;

const SYSTEM_IMPORT = /["'`]@\/systems\//;

describe("system imports ratchet", () => {
  const exempt = readImportsExempt();

  it("lists each file once with a known reason", () => {
    expect(new Set(exempt.map((e) => e.file)).size).toBe(exempt.length);
    expect(exempt.filter((e) => !REASON.test(e.reason)).map((e) => e.file)).toEqual([]);
  });

  it("every entry exists and still imports @/systems/ (lower the list)", () => {
    const stale = exempt.filter((e) => !fs.existsSync(path.join(ROOT, e.file)) || !SYSTEM_IMPORT.test(fs.readFileSync(path.join(ROOT, e.file), "utf8")) || isImportAllowed(e.file));

    expect(stale.map((e) => e.file)).toEqual([]);
  });

  it("no file outside the list imports @/systems/ (new leak)", () => {
    const listed = new Set(exempt.map((e) => e.file));

    expect(scanImporters().filter((file) => !listed.has(file))).toEqual([]);
  });

  it("ESLint rejects a new importer and spares roots and exempt files", async () => {
    const eslint = new ESLint({ cwd: ROOT });

    const lint = async (filePath: string) => (await eslint.lintText('import x from "@/systems/wfrp/rules";\nexport { x };\n', { filePath })).flatMap((r) => r.messages.filter((m) => m.ruleId === "systems/zone"));

    expect(await lint("lib/utils/battle/foo.ts")).toHaveLength(1);
    expect(await lint(SYSTEM_ROOTS[0])).toEqual([]);
    expect(await lint(exempt[0].file)).toEqual([]);
  });
});
