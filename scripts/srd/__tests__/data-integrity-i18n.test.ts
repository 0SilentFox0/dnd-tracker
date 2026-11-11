import { describe, expect, it, vi } from "vitest";

import { stubImportDeps } from "@/lib/server/content/__tests__/stub-import-deps";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn() }));
vi.mock("@/lib/server/content/resources", () => ({ CONTENT_RESOURCES: {} }));

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { applyOverlay } from "../lib/apply-overlay";
import { readSrdData, toImportRows } from "../lib/data-files";
import { SRD_DATA_DIR } from "../lib/source";
import { SRD_KINDS, type SrdKind } from "../lib/types";

import { createArtifactSchema, createClassSchema, createRaceSchema, createSpellGroupSchema, createSpellSchema, patchArtifactSchema, updateClassSchema, updateRaceSchema, updateSpellGroupSchema, updateSpellSchema } from "@/lib/schemas";
import { createBackgroundSchema, updateBackgroundSchema } from "@/lib/schemas/backgrounds";
import { createFeatSchema, updateFeatSchema } from "@/lib/schemas/feats";
import { createUnitSchema, updateUnitSchema } from "@/lib/schemas/units";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { importContent } from "@/lib/server/content/import/import-content";
import type { Actor } from "@/lib/utils/api/actor";
import { extractKeyed, type TranslationsV2 } from "@/lib/utils/templates/i18n/keys";

const SCHEMAS = {
  "spell-groups": { create: createSpellGroupSchema, update: updateSpellGroupSchema },
  spells: { create: createSpellSchema, update: updateSpellSchema },
  races: { create: createRaceSchema, update: updateRaceSchema },
  classes: { create: createClassSchema, update: updateClassSchema },
  backgrounds: { create: createBackgroundSchema, update: updateBackgroundSchema },
  feats: { create: createFeatSchema, update: updateFeatSchema },
  units: { create: createUnitSchema, update: updateUnitSchema },
  artifacts: { create: createArtifactSchema, update: patchArtifactSchema },
} as const;

const actor: Actor = { campaignId: "c1", userId: "u1", isDM: true, via: "session", scopes: null };

function tempDirWith(locale: string, translations: TranslationsV2) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "srd-i18n-"));

  for (const f of fs.readdirSync(SRD_DATA_DIR).filter((f) => f.endsWith(".json"))) fs.copyFileSync(path.join(SRD_DATA_DIR, f), path.join(dir, f));

  fs.mkdirSync(path.join(dir, "i18n"));
  fs.writeFileSync(path.join(dir, "i18n", `${locale}.json`), JSON.stringify(translations));

  return dir;
}

async function dryRunAll(data: ReturnType<typeof readSrdData>) {
  const names = (k: SrdKind) => (data[k] as ReadonlyArray<{ slug: string; name: string }>).map((r) => ({ id: `id-${r.slug}`, name: r.name }));

  for (const kind of SRD_KINDS) {
    const resource = { schemas: SCHEMAS[kind], invalidates: [] } as unknown as AnyContentResource;

    const report = await importContent(actor, kind, { rows: toImportRows(data[kind]), mode: "create", dryRun: true }, stubImportDeps({ resource: () => resource, loadNames: async (_c, k) => (k !== kind && (SRD_KINDS as readonly string[]).includes(k) ? names(k as SrdKind) : []) }));

    expect(report.results.filter((r) => r.status !== "created" || r.issues.length > 0), kind).toEqual([]);
  }
}

describe("SRD i18n overlay", () => {
  it("переклад назви заклинання, класу й опису проходить імпорт і зберігає посилання за назвою", async () => {
    const en = readSrdData();

    const tr: TranslationsV2 = Object.fromEntries(
      extractKeyed(en, SRD_KINDS)
        .filter((e) => e.cls === "n" && ["Fireball", "Wizard", "Draconic Ancestry"].includes(e.en))
        .map((e) => [e.key, { text: `UK ${e.en}`, en: e.en }]),
    );

    expect(new Set(Object.values(tr).map((entry) => entry.en))).toEqual(new Set(["Fireball", "Wizard", "Draconic Ancestry"]));

    const dir = tempDirWith("xx", tr);

    try {
      const data = readSrdData(dir, "xx");

      expect(data.spells.some((s) => s.name === "UK Fireball")).toBe(true);
      expect(data.spells.some((s) => s.lists.includes("UK Wizard"))).toBe(true);
      await dryRunAll(data);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("мова без жодного перекладу дорівнює англійській", () => {
    const dir = tempDirWith("xx", { "spells/nothing/name": { text: "Нічого", en: "Nothing" } });

    try {
      expect(readSrdData(dir, "xx")).toEqual(readSrdData());
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each(["uk"])("%s: усе проходить імпорт без помилок і попереджень", async (locale) => {
    await dryRunAll(readSrdData(undefined, locale));
  });
});

describe("shared overlay compatibility", () => {
  it("keeps every shipped translation key discoverable and current", () => {
    const entries = new Map(extractKeyed(readSrdData(), SRD_KINDS).map((entry) => [entry.key, entry]));

    const translations = JSON.parse(fs.readFileSync(path.join(SRD_DATA_DIR, "i18n", "uk.json"), "utf8")) as TranslationsV2;

    expect(Object.keys(translations)).toHaveLength(7461);
    expect(Object.keys(translations).filter((key) => !entries.has(key))).toEqual([]);
    expect(Object.entries(translations).filter(([key, entry]) => entries.get(key)?.en !== entry.en).map(([key]) => key)).toEqual([]);
    expect([...entries.values()].some((entry) => entry.en === "Choose 3 Musical Instruments" && entry.cls === "d")).toBe(true);
  });

  it("localized real unit attack references resolve within their owning unit", () => {
    const en = readSrdData();

    const translations: TranslationsV2 = Object.fromEntries(extractKeyed(en, ["units"]).filter((e) => /^attacks\[[^\]]*\]\.name$/.test(e.fieldPath)).map((e) => [e.key, { text: `UK ${e.en}`, en: e.en }]));

    const out = applyOverlay(en, translations, SRD_KINDS);

    for (const unit of out.units) {
      for (const ability of unit.abilities) {
        if (ability.perform?.kind === "attack") {
          const target = ability.perform.attack.toLowerCase();

          expect(unit.attacks.some((attack) => attack.name.toLowerCase() === target), unit.name).toBe(true);
        }
      }
    }

    expect(applyOverlay(en, {}, SRD_KINDS)).toEqual(en);
  });
});
