import { parse, TYPE } from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";

import { API_ERROR_PARAMS, API_ERRORS } from "../api-errors";

import { LOCALES, type Namespace } from "@/lib/i18n/config";
import { localSource } from "@/lib/i18n/local-source";

type Node = ReturnType<typeof parse>[number];

const lookup = (tree: Record<string, unknown>, path: string[]): unknown => path.reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), tree);

function argNames(nodes: Node[], into = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (node.type === TYPE.literal || node.type === TYPE.pound) continue;

    into.add(node.value);

    if (node.type === TYPE.plural || node.type === TYPE.select) for (const option of Object.values(node.options)) argNames(option.value, into);
  }

  return into;
}

const values = Object.values(API_ERRORS) as string[];

describe("API_ERRORS", () => {
  it("values are unique keys without Cyrillic", () => {
    expect(new Set(values).size).toBe(values.length);

    for (const value of values) expect(value).not.toMatch(/[Ѐ-ӿ]/);
  });

  it.each(LOCALES)("every key exists in the %s catalog", async (locale) => {
    const trees = new Map<string, Record<string, unknown>>();

    const missing: string[] = [];

    for (const value of values) {
      const [namespace, ...path] = value.split(".");

      if (!trees.has(namespace)) trees.set(namespace, await localSource.load(locale, namespace as Namespace));

      if (typeof lookup(trees.get(namespace) ?? {}, path) !== "string") missing.push(value);
    }

    expect(missing).toEqual([]);
  });

  it("API_ERROR_PARAMS keys are API_ERRORS values", () => {
    for (const key of Object.keys(API_ERROR_PARAMS)) expect(values).toContain(key);
  });

  it("every ICU argument of a registered key is in its params", async () => {
    for (const [key, params] of Object.entries(API_ERROR_PARAMS)) {
      const [namespace, ...path] = key.split(".");

      const text = lookup(await localSource.load("uk", namespace as Namespace), path) as string;

      for (const arg of argNames(parse(text))) expect(Object.keys(params ?? {}), `${key}: ${arg}`).toContain(arg);
    }
  });
});
