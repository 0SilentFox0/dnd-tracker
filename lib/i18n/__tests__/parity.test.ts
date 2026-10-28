import { parse, TYPE } from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";

import { LOCALES, NAMESPACES } from "../config";
import { localSource } from "../local-source";

type Tree = Record<string, unknown>;
type Node = ReturnType<typeof parse>[number];

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") out[path] = value;
    else if (value && typeof value === "object" && !Array.isArray(value)) Object.assign(out, flatten(value as Tree, path));
    else throw new Error(`non-string leaf: ${path}`);
  }

  return out;
}

function argNames(nodes: Node[], into = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (node.type === TYPE.literal || node.type === TYPE.pound) continue;

    into.add(node.value);

    if (node.type === TYPE.plural || node.type === TYPE.select) {
      for (const option of Object.values(node.options)) argNames(option.value, into);
    } else if (node.type === TYPE.tag) {
      argNames(node.children, into);
    }
  }

  return into;
}

export function findDrift(base: Tree, other: Tree): string[] {
  const a = flatten(base);

  const b = flatten(other);

  const problems: string[] = [];

  for (const key of Object.keys(a)) if (!(key in b)) problems.push(`missing: ${key}`);
  for (const key of Object.keys(b)) if (!(key in a)) problems.push(`extra: ${key}`);

  for (const key of Object.keys(a)) {
    if (!(key in b)) continue;

    const left = [...argNames(parse(a[key]))].sort().join(",");

    const right = [...argNames(parse(b[key]))].sort().join(",");

    if (left !== right) problems.push(`args differ: ${key} (${left} vs ${right})`);
  }

  return problems;
}

describe("detects drift", () => {
  it("fails loudly on a non-string leaf", () => {
    expect(() => findDrift({ a: "x" }, { a: 1 as unknown as string })).toThrow(/non-string leaf: a/);
  });

  it("reports missing, extra and argument mismatches", () => {
    const uk = { a: "x", n: { count: "{count, plural, one {# шт} other {# шт}}" }, gone: "y" };

    const en = { a: "x", n: { count: "{total, plural, one {# pc} other {# pcs}}" }, added: "z" };

    expect(findDrift(uk, en).sort()).toEqual(["args differ: n.count (count vs total)", "extra: added", "missing: gone"]);
  });

  it("accepts identical structure", () => {
    expect(findDrift({ a: "Hi {name}" }, { a: "Привіт {name}" })).toEqual([]);
  });
});

describe("uk/en parity", () => {
  it.each(NAMESPACES)("%s has the same keys and ICU arguments in every locale", async (namespace) => {
    const [base, ...rest] = await Promise.all(LOCALES.map((locale) => localSource.load(locale, namespace)));

    for (const other of rest) expect(findDrift(base as Tree, other as Tree)).toEqual([]);
  });
});
