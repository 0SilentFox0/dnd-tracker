import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import { D6POOL_SLOT,D6POOL_SYSTEM } from "./fixtures/d6pool/definition";
import { D6POOL_META } from "./fixtures/d6pool/meta";
import { D6POOL_SERVER } from "./fixtures/d6pool/server";
import { D6POOL_UI } from "./fixtures/d6pool/ui";
import { assertSystemContract } from "./helpers/system-contract";

import { SYSTEM_UI } from "@/components/systems/registry";
import { SYSTEM_SERVER } from "@/lib/server/systems/registry";
import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";
import { metaOf, RULE_SYSTEM_KEYS, SYSTEM_META, type SystemMeta, systemNamespaces } from "@/lib/utils/rules/systems/meta";
import { readRequires } from "@/scripts/shared/system-requires.mjs";
import { PACK_HOOKS, SYSTEM_MODULE } from "@/scripts/templates/systems";

const ROOT = path.resolve(__dirname, "../..");

const keysOf = (record: Record<string, unknown>) => Object.keys(record).sort();

describe("system exhaustiveness", () => {
  const keys = [...RULE_SYSTEM_KEYS].sort();

  it("keys, logic, ui, server schemas and pack hooks cover the same systems", () => {
    expect(keysOf(RULE_SYSTEM_REGISTRY)).toEqual(keys);
    expect(keysOf(SYSTEM_UI)).toEqual(keys);
    expect(keysOf(SYSTEM_SERVER)).toEqual(keys);
    expect(keysOf(PACK_HOOKS)).toEqual(keys);
    expect(keysOf(SYSTEM_MODULE)).toEqual(keys);
  });

  it("systems/* folders are the meta modules without d20, each with meta.ts and index.ts", () => {
    const folders = fs.readdirSync(path.join(ROOT, "systems"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();

    expect(folders).toEqual(SYSTEM_META.map((m) => m.module).filter((m) => m !== "d20").sort());

    for (const id of folders) for (const file of ["meta.ts", "index.ts"]) expect(fs.existsSync(path.join(ROOT, "systems", id, file)), `systems/${id}/${file}`).toBe(true);
  });

  it.each(["uk", "en"])("gameTerms.ruleSystem has every key in %s", (locale) => {
    const terms = JSON.parse(fs.readFileSync(path.join(ROOT, `messages/${locale}/gameTerms.json`), "utf8")) as { ruleSystem: Record<string, string> };

    expect(keysOf(terms.ruleSystem)).toEqual(keys);
  });

  it.each(["uk", "en"])("every namespace of a meta has a message file in %s", (locale) => {
    for (const ns of systemNamespaces()) expect(fs.existsSync(path.join(ROOT, `messages/${locale}/${ns}.json`)), `${locale}/${ns}`).toBe(true);
  });

  it.each(keys)("%s passes the system contract", (key) => {
    const meta = metaOf(key);

    expect(meta).toBeDefined();

    assertSystemContract(meta as NonNullable<typeof meta>, RULE_SYSTEM_REGISTRY[key], SYSTEM_UI[key], SYSTEM_SERVER[key]);
  });
});

describe("server operations do not collide", () => {
  it("a system operation key clashing with a core key throws", async () => {
    const { mergeSystemOperations } = await import("@/lib/server/systems/registry");

    const key = Object.keys(SYSTEM_SERVER.wfrp.operations ?? {})[0];

    expect(key).toBeDefined();
    expect(() => mergeSystemOperations({ [key]: 1 }, () => 2)).toThrow(/Duplicate/);
    expect(mergeSystemOperations({ other: 1 }, () => 2)[key]).toBe(2);
  });
});

describe("fixture system d6pool", () => {
  it("passes the same contract as the real systems", () => assertSystemContract(D6POOL_META, D6POOL_SYSTEM, D6POOL_UI, D6POOL_SERVER));

  it("the fixture imports only the contract and core types", () => {
    for (const file of ["meta", "definition", "ui", "server"]) {
      const text = fs.readFileSync(path.join(__dirname, `fixtures/d6pool/${file}.ts`), "utf8");

      expect(text, file).not.toMatch(/@\/systems\/|@\/scripts\//);
    }
  });

  it("its slot reads its own data and ignores wfrp", () => {
    expect(D6POOL_SLOT.read({ key: "d6pool", data: { pool: 4 } })).toEqual({ pool: 4 });
    expect(D6POOL_SLOT.read({ key: "wfrp", data: { pool: 4 } })).toBeUndefined();
    expect(D6POOL_SLOT.read({ key: "d6pool", data: { pool: "x" } })).toBeUndefined();
    expect(D6POOL_SLOT.read(undefined)).toBeUndefined();
    expect(D6POOL_SLOT.write({ pool: 2 })).toEqual({ key: "d6pool", data: { pool: 2 } });
  });

  it("the wfrp slot does not read d6pool data", () => {
    const wfrp = RULE_SYSTEM_REGISTRY.wfrp;

    expect(wfrp.characteristics.sheetBlock({ characteristics: { pool: 3 }, resources: {} })?.key).not.toBe("d6pool");
  });
});

describe("eslint isolation requires", () => {
  const systemsDir = pathToFileURL(`${path.join(ROOT, "systems")}/`);

  it.each((SYSTEM_META as readonly SystemMeta[]).filter((m) => m.module !== "d20").map((m) => [m.module, m.requires ?? []] as const))("%s: eslint parse of meta.ts equals META.requires", (id, requires) => {
    expect(readRequires(systemsDir, id)).toEqual([...requires]);
  });
});
