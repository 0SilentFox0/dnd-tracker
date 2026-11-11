import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { NAMESPACES } from "@/lib/i18n/config";
import { isRuleSystemKey, metaOf, RULE_SYSTEM_KEYS, SYSTEM_META, systemNamespaces } from "@/lib/utils/rules/systems/meta";

const ROOT = path.resolve(__dirname, "../../../../..");

const META_FILES = ["lib/utils/rules/systems/d20/meta.ts", "systems/wfrp/meta.ts"];

describe("system meta", () => {
  it("lists d20 keys first, then systems/* alphabetically", () => expect(RULE_SYSTEM_KEYS).toEqual(["homm", "dnd5e", "wfrp"]));

  it("resolves keys", () => {
    expect(isRuleSystemKey("wfrp")).toBe(true);
    expect(isRuleSystemKey("nope")).toBe(false);
    expect(metaOf("homm")?.module).toBe("d20");
    expect(metaOf("wfrp")?.module).toBe("wfrp");
    expect(metaOf("nope")).toBeUndefined();
  });

  it("every system namespace is a known namespace", () => {
    const known: readonly string[] = NAMESPACES;

    expect(systemNamespaces().filter((ns) => !known.includes(ns))).toEqual([]);
    expect(systemNamespaces()).toContain("battleWfrp");
  });

  it("module names are unique", () => expect(new Set(SYSTEM_META.map((m) => m.module)).size).toBe(SYSTEM_META.length));

  it.each(META_FILES)("%s has no value imports", (file) => {
    const imports = readFileSync(path.join(ROOT, file), "utf8").match(/^import\s+(?!type\b)[^;]*from\s+"[^"]+"/gm) ?? [];

    expect(imports).toEqual([]);
  });
});
