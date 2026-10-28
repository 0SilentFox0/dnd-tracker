import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createRaceSchema } from "@/lib/schemas";
import { createUnitSchema, updateUnitSchema } from "@/lib/schemas/units";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { importContent } from "@/lib/server/content/import/import-content";
import type { Actor } from "@/lib/utils/api/actor";
import { IMPORT_SPECS } from "@/lib/utils/content/import";
import { recordToCells } from "@/lib/utils/content/import/mapping";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const resource = { schemas: { create: createRaceSchema, update: createRaceSchema }, invalidates: [] } as unknown as AnyContentResource;

const spells = [{ id: "sp-druidcraft", name: "Druidcraft" }, { id: "sp-longstrider", name: "Longstrider" }];

const choices = [{ id: "l", label: "L", kind: "option", lineage: true, options: [{ id: "wood-elf", name: "Wood Elf", spells: [{ level: 1, spellId: "Druidcraft" }, { level: 3, spellId: "longstrider" }, { level: 5, spellId: "Nope" }] }] }];

describe("nested spell names in race choices", () => {
  it("resolves names (case-insensitive) and ids, errors on unknown like the real import", async () => {
    const report = await importContent(actor, "races", { rows: [{ name: "Elf", choices: JSON.stringify(choices) }], mode: "create", dryRun: true }, { resource: () => resource, loadNames: async (_c, k) => (k === "spells" ? spells : []) });

    expect(report.results[0].status).toBe("error");
    expect(report.results[0].issues).toEqual([{ field: "choices", level: "error", message: "Вибори (JSON): не знайдено «Nope» (Заклинання)" }]);
  });

  it("export writes names back", () => {
    const record = { name: "Elf", choices: [{ ...choices[0], options: [{ ...choices[0].options[0], spells: [{ level: 1, spellId: "sp-druidcraft" }] }] }] };

    const cells = recordToCells(IMPORT_SPECS.races, record, (kind, id) => (kind === "spells" ? spells.find((s) => s.id === id)?.name : undefined));

    expect(cells.join("|")).toContain('"spellId":"Druidcraft"');
  });
});

it("imports perform names as IDs and exports them for another campaign", async () => {
  let stored: Record<string, unknown> = {};

  const unitResource = {
    schemas: { create: createUnitSchema, update: updateUnitSchema },
    invalidates: [],
    create: async (_actor: Actor, body: Record<string, unknown>) => {
      stored = body;

      return { id: "unit", ...body };
    },
  } as unknown as AnyContentResource;

  const ability = { id: "command", name: "Command", trigger: { event: "action" }, limits: { legendaryCost: 1 }, perform: { kind: "spell", spellId: "Druidcraft" }, effects: [{ kind: "note", text: "Cast" }] };

  const deps = { resource: () => unitResource, loadNames: async (_c: string, k: string) => k === "spells" ? spells : [] };

  expect((await importContent(actor, "units", { rows: [{ name: "Dragon", abilities: [ability] }], mode: "create", dryRun: false }, deps)).counts.error).toBe(0);
  expect(stored.abilities).toMatchObject([{ perform: { spellId: "sp-druidcraft" } }]);

  const cells = recordToCells(IMPORT_SPECS.units, stored, (kind, id) => kind === "spells" ? spells.find((s) => s.id === id)?.name : undefined);

  const abilities = cells[IMPORT_SPECS.units.fields.findIndex((f) => f.key === "abilities")];

  expect(abilities).toContain('"spellId":"Druidcraft"');
  await importContent({ ...actor, campaignId: "c2" }, "units", { rows: [{ name: "Dragon", abilities }], mode: "create", dryRun: false }, { ...deps, loadNames: async (_c, k) => k === "spells" ? [{ id: "c2-spell", name: "Druidcraft" }] : [] });
  expect(stored.abilities).toMatchObject([{ perform: { spellId: "c2-spell" } }]);
});

it("rejects unknown perform names and duplicate grant names in import planning", async () => {
  const unitResource = { schemas: { create: createUnitSchema, update: updateUnitSchema }, invalidates: [] } as unknown as AnyContentResource;

  const result = await importContent(actor, "units", { rows: [
    { name: "Broken", abilities: [{ id: "command", name: "Command", trigger: { event: "action" }, limits: { legendaryCost: 1 }, perform: { kind: "spell", spellId: "Missing" }, effects: [{ kind: "note", text: "Cast" }] }] },
    { name: "Duplicate", spellcasting: { spells: [{ spellId: "Druidcraft" }, { spellId: "sp-druidcraft", perBattle: 1 }] } },
  ], mode: "create", dryRun: true }, { resource: () => unitResource, loadNames: async (_c, k) => k === "spells" ? spells : [] });

  expect(result.results.map((r) => r.status)).toEqual(["error", "error"]);
});

it("imports item spell names and exports portable names", async () => {
  const { createArtifactSchema, patchArtifactSchema } = await import("@/lib/schemas/artifacts");

  let stored: Record<string, unknown> = {};

  const resource = { schemas: { create: createArtifactSchema, update: patchArtifactSchema }, invalidates: [], create: async (_actor: Actor, body: Record<string, unknown>) => { stored = body;

 return { id: "wand", ...body }; } } as unknown as AnyContentResource;

  const result = await importContent(actor, "artifacts", { rows: [{ name: "Wand", slot: "item", item: { charges: { max: 7, rest: "long" }, spells: [{ spellId: "Longstrider", cost: 1 }] } }], mode: "create", dryRun: false }, { resource: () => resource, loadNames: async (_c, k) => k === "spells" ? spells : [] });

  expect(result.counts.error).toBe(0);
  expect(stored.item).toMatchObject({ spells: [{ spellId: "sp-longstrider" }] });
  expect(recordToCells(IMPORT_SPECS.artifacts, stored, (kind, id) => kind === "spells" ? spells.find((s) => s.id === id)?.name : undefined).join("|")).toContain('"spellId":"Longstrider"');
});
