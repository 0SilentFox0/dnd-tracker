import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn() }));
vi.mock("@/lib/server/content/resources", () => ({ CONTENT_RESOURCES: {} }));

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { extractCatalog, hashText } from "../i18n/catalog";
import { listLocales } from "../i18n/store";
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

function tempDirWith(locale: string, translations: Record<string, string>) {
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

    const report = await importContent(actor, kind, { rows: toImportRows(data[kind]), mode: "create", dryRun: true }, { resource: () => resource, loadNames: async (_c, k) => (k !== kind && (SRD_KINDS as readonly string[]).includes(k) ? names(k as SrdKind) : []) });

    expect(report.results.filter((r) => r.status !== "created" || r.issues.length > 0), kind).toEqual([]);
  }
}

describe("SRD i18n overlay", () => {
  it("переклад назви заклинання, класу й опису проходить імпорт і зберігає посилання за назвою", async () => {
    const en = readSrdData();

    const tr = Object.fromEntries(
      extractCatalog(en)
        .filter((e) => e.cls === "n" && ["Fireball", "Wizard", "Draconic Ancestry"].includes(e.en))
        .map((e) => [e.hash, `UK ${e.en}`]),
    );

    expect(Object.keys(tr)).toHaveLength(3);

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
    const dir = tempDirWith("xx", { [hashText("n", "Nothing")]: "Нічого" });

    try {
      expect(readSrdData(dir, "xx")).toEqual(readSrdData());
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each(listLocales().filter((l) => l !== "en"))("%s: усе проходить імпорт без помилок і попереджень", async (locale) => {
    await dryRunAll(readSrdData(undefined, locale));
  });
});
