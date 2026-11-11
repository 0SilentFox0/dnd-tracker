import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { leakedIds } from "../lib/export";
import { listPackKeys, packPath, readManifest, readPack, TEMPLATES_DIR } from "../lib/pack";
import { validatePack } from "../lib/validate";

import { DICTIONARY_LOADERS } from "@/data/templates/dictionaries.server";
import { MANIFESTS } from "@/data/templates/manifests";
import { LEGACY_KEY_BY_NAME, TEMPLATE_REGISTRY } from "@/lib/utils/templates/registry";

const keys = Object.keys(TEMPLATE_REGISTRY);

describe("every pack of data/templates", () => {
  it.each(keys)("%s: validates without errors", (key) => {
    expect(validatePack(readPack(key)).filter((issue) => issue.level === "error").map((issue) => issue.message)).toEqual([]);
  });

  it("ratchet: ids left inside pack rows (D25b) never grow past 60", () => {
    const total = keys.reduce((sum, key) => sum + Object.values(leakedIds(readPack(key))).reduce((a, n) => a + n, 0), 0);

    expect(total).toBeLessThanOrEqual(60);
  });

  it("registry, folders and generated manifests list the same packs", () => {
    expect(listPackKeys()).toEqual([...keys].sort());
    expect(Object.keys(MANIFESTS).sort()).toEqual([...keys].sort());
  });

  it.each(keys)("%s: the registry manifest is the manifest file", (key) => {
    expect(TEMPLATE_REGISTRY[key]).toEqual(readManifest(key));
  });

  it("dictionary loaders exist exactly for packs with translated locales", () => {
    const expected = keys.filter((key) => TEMPLATE_REGISTRY[key].locales.some((locale) => locale !== "en")).sort();

    expect(Object.keys(DICTIONARY_LOADERS).sort()).toEqual(expected);

    for (const key of expected)
      expect(Object.keys(DICTIONARY_LOADERS[key]).sort(), key).toEqual(TEMPLATE_REGISTRY[key].locales.filter((locale) => locale !== "en").sort());
  });

  it.each(keys)("%s: every non-English locale has a dictionary file and every dictionary a locale", (key) => {
    const locales = TEMPLATE_REGISTRY[key].locales.filter((locale) => locale !== "en");

    const dir = packPath(key, "i18n", TEMPLATES_DIR);

    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => file.endsWith(".json")).map((file) => path.basename(file, ".json")) : [];

    expect(files.sort()).toEqual([...locales].sort());
  });

  it("legacy names map to registered packs", () => {
    for (const key of Object.values(LEGACY_KEY_BY_NAME)) expect(keys, key).toContain(key);
  });
});
