import * as path from "path";
import { describe, expect, it } from "vitest";

import { readGrimData } from "../data";
import { grimCatalog, grimI18nIssues } from "../i18n";
import { GRIM_SPELL_LISTS } from "../spells";

import { emptyBundle } from "@/lib/server/templates/bundle";
import { localizeSrdBundle } from "@/lib/server/templates/localize-srd-bundle";
import { extractCatalog, hashText } from "@/lib/srd/i18n/catalog";
import { templateOf } from "@/scripts/srd/i18n/templates";
import { readSrdData } from "@/scripts/srd/lib/data-files";

const data = readGrimData();

const fixtures = readGrimData(path.join(__dirname, "fixtures"));

const SRD_CATALOG_SIZE = 4658;

describe("grimCatalog", () => {
  const catalog = grimCatalog(data);

  const has = (cls: "n" | "d", en: string) => catalog.some((e) => e.cls === cls && e.en === en);

  it("covers career, tier and spell list names and trappings", () => {
    for (const career of data.careers) {
      expect(has("n", String(career.name))).toBe(true);
      expect(has("n", String(career.class))).toBe(true);

      for (const n of [1, 2, 3, 4]) {
        expect(has("n", String(career[`tier${n}_name`]))).toBe(true);

        for (const item of (career[`tier${n}_trappings`] ?? []) as string[]) expect(has("d", item)).toBe(true);
      }
    }

    for (const name of Object.values(GRIM_SPELL_LISTS).flat()) expect(has("n", name)).toBe(true);
  });

  it("covers rule table texts and skips statuses and skill keys", () => {
    const tables = data.rules?.tables as Record<string, Array<{ text: string }>>;

    for (const rows of Object.values(tables)) for (const row of rows) expect(has("d", row.text)).toBe(true);

    expect(catalog.some((e) => e.en === "Brass 3" || e.en === "lore:herbs")).toBe(false);
  });

  it("hashes match localizeSrdBundle on DB-shaped careers", () => {
    const career = data.careers.find((c) => c.name === "Archivist");

    if (!career) throw new Error("Archivist missing");

    const trapping = (career.tier1_trappings as string[])[0];

    const bundle = emptyBundle();

    bundle.careers = [{ id: "c1", name: "Archivist", class: "Academic", tiers: [{ name: "Copyist", trappings: [trapping] }] }];

    const out = localizeSrdBundle(bundle, { [hashText("d", trapping)]: "X" });

    expect((out.careers[0].tiers as Array<{ trappings: string[] }>)[0].trappings).toEqual(["X"]);
  });

  it("works on fixtures", () => {
    expect(grimCatalog(fixtures).length).toBeGreaterThan(0);
  });
});

describe("grimI18nIssues", () => {
  it("is empty for no translations", () => {
    expect(grimI18nIssues(data, {})).toEqual([]);
  });

  it("flags colliding spell lists and careers", () => {
    const lists = { [hashText("n", "School of Embers")]: "Школа", [hashText("n", "School of Gloam")]: "Школа" };

    expect(grimI18nIssues(data, lists).join("\n")).toContain("spell lists");

    const [a, b] = data.careers.map((c) => String(c.name));

    expect(grimI18nIssues(data, { [hashText("n", a)]: "Одна", [hashText("n", b)]: "Одна" }).join("\n")).toContain("careers");
  });
});

describe("templateOf", () => {
  it("strips the option", () => {
    expect(templateOf(["apply", "--template", "grim", "a.jsonl"]).rest).toEqual(["apply", "a.jsonl"]);
  });

  it("rejects unknown templates", () => {
    expect(() => templateOf(["--template", "xyz"])).toThrow();
  });
});

describe("SRD catalog", () => {
  it("keeps its size", () => {
    expect(extractCatalog(readSrdData()).length).toBe(SRD_CATALOG_SIZE);
  });
});
