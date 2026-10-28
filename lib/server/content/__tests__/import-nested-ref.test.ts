import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createRaceSchema } from "@/lib/schemas";
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
