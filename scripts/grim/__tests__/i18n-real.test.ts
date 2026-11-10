import { describe, expect, it } from "vitest";

import { readGrimData } from "../data";
import { GRIM_I18N_DIR, grimCatalog, grimI18nIssues } from "../i18n";

import { readTranslations } from "@/scripts/srd/i18n/store";
import { checkTranslation } from "@/scripts/srd/i18n/validate";

const data = readGrimData();

const catalog = grimCatalog(data);

const uk = readTranslations("uk", GRIM_I18N_DIR);

describe("grim uk dictionary", () => {
  it("translates every catalog entry", () => {
    expect(catalog.filter((entry) => uk[entry.hash] === undefined).map((entry) => entry.en)).toEqual([]);
  });

  it("has no cross-entry issues", () => {
    expect(grimI18nIssues(data, uk)).toEqual([]);
  });

  it("keeps numbers, dice and placeholders", () => {
    const bad = catalog.flatMap((entry) => checkTranslation(entry.en, uk[entry.hash]).map((issue) => `${entry.en}: ${JSON.stringify(issue)}`));

    expect(bad).toEqual([]);
  });

  it("gives distinct names to distinct names of one kind", () => {
    const seen = new Map<string, string>();

    const clashes: string[] = [];

    for (const entry of catalog.filter((e) => e.cls === "n")) {
      for (const kind of entry.kinds) {
        const key = `${kind}\0${uk[entry.hash]}`;

        const other = seen.get(key);

        if (other !== undefined && other !== entry.en) clashes.push(`${kind}: "${other}" / "${entry.en}" -> ${uk[entry.hash]}`);

        seen.set(key, entry.en);
      }
    }

    expect(clashes).toEqual([]);
  });
});
