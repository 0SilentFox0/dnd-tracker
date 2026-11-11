import { describe, expect, it } from "vitest";

import { catalogOfPack } from "../../../lib/i18n-convert";
import { wfrpI18nIssues } from "../i18n";
import { GRIM_SPELL_LISTS } from "../spells";
import { fixturePack, grimData, grimPack } from "./pack-helpers";

import { emptyBundle } from "@/lib/server/templates/bundle";
import { localizeTemplateBundle } from "@/lib/server/templates/localize-template-bundle";
import { catalogOf } from "@/scripts/templates/lib/i18n-convert";

const pack = grimPack();

const data = grimData();

const SRD_CATALOG_SIZE = 8137;

describe("wfrp catalog", () => {
  const catalog = catalogOfPack(pack);

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

  it("keys match localizeTemplateBundle on DB-shaped careers", () => {
    const career = data.careers.find((c) => c.name === "Archivist");

    if (!career) throw new Error("Archivist missing");

    const trapping = (career.tier1_trappings as string[])[0];

    expect(catalog.some((e) => e.key === "careers/archivist/tiers[=copyist].trappings[0]" && e.en === trapping)).toBe(true);

    const bundle = emptyBundle();

    bundle.careers = [{ id: "c1", slug: "archivist", name: "Archivist", class: "Academic", tiers: [{ name: "Copyist", trappings: [trapping] }] }];

    const out = localizeTemplateBundle(bundle, { "careers/archivist/tiers[=copyist].trappings[0]": { text: "X", en: trapping } });

    expect((out.careers[0].tiers as Array<{ trappings: string[] }>)[0].trappings).toEqual(["X"]);
  });

  it("works on fixtures", () => {
    expect(catalogOfPack(fixturePack()).length).toBeGreaterThan(0);
  });
});

describe("wfrpI18nIssues", () => {
  it("is empty for no translations", () => {
    expect(wfrpI18nIssues(pack, {})).toEqual([]);
  });

  it("flags colliding spell lists and careers", () => {
    const lists = { "lists/school-of-embers/name": { text: "Школа", en: "School of Embers" }, "lists/school-of-gloam/name": { text: "Школа", en: "School of Gloam" } };

    expect(wfrpI18nIssues(pack, lists).join("\n")).toContain("spell lists");

    const [a, b] = data.careers.map((c) => ({ slug: String(c.slug), name: String(c.name) }));

    expect(wfrpI18nIssues(pack, { [`careers/${a.slug}/name`]: { text: "Одна", en: a.name }, [`careers/${b.slug}/name`]: { text: "Одна", en: b.name } }).join("\n")).toContain("careers");
  });

  it("checks every list of a spell, not only the first", () => {
    const spells = [{ ...data.spells[0], lists: [...(data.spells[0].lists as string[]), "Unknown School"] }] as never;

    expect(wfrpI18nIssues({ ...pack, rows: { ...pack.rows, spells } }, {}).join("\n")).toContain('list "Unknown School"');
  });
});

describe("SRD catalog", () => {
  it("keeps its size", () => {
    expect(catalogOf("srd-5.2").length).toBe(SRD_CATALOG_SIZE);
  });
});
