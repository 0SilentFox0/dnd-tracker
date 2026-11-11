import { describe, expect, it } from "vitest";

import { readGrimData } from "../data";
import { grimCatalog, grimI18nIssues } from "../i18n";

import { statusOf } from "@/lib/utils/templates/i18n/keys";
import { checkTranslation } from "@/scripts/srd/i18n/validate";
import { readTranslations } from "@/scripts/templates/lib/i18n-store";

const data = readGrimData();

const catalog = grimCatalog(data);

const uk = readTranslations("grim-d100", "uk");

describe("grim uk dictionary", () => {
  it("translates every catalog entry and has no stale or orphan entries", () => {
    const status = statusOf(catalog, uk);

    expect({ missing: status.missing, stale: status.stale, orphan: status.orphan }).toEqual({ missing: [], stale: [], orphan: [] });
  });

  it("has no cross-entry issues", () => {
    expect(grimI18nIssues(data, uk)).toEqual([]);
  });

  it("keeps numbers, dice and placeholders", () => {
    const bad = catalog.flatMap((entry) => checkTranslation(entry.en, uk[entry.key].text).map((issue) => `${entry.en}: ${JSON.stringify(issue)}`));

    expect(bad).toEqual([]);
  });

  it("gives distinct names to distinct names of one kind", () => {
    const seen = new Map<string, string>();

    const clashes: string[] = [];

    for (const entry of catalog.filter((e) => e.cls === "n" && e.fieldPath === "name")) {
      const key = `${entry.kind}\0${uk[entry.key].text}`;

      const other = seen.get(key);

      if (other !== undefined && other !== entry.en) clashes.push(`${entry.kind}: "${other}" / "${entry.en}" -> ${uk[entry.key].text}`);

      seen.set(key, entry.en);
    }

    expect(clashes).toEqual([]);
  });
});
