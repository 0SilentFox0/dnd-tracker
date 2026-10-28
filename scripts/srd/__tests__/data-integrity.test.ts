import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn() }));
vi.mock("@/lib/server/content/resources", () => ({ CONTENT_RESOURCES: {} }));

import type { ZodType } from "zod";

import { readSrdData, readSrdManifest, toImportRows } from "../lib/data-files";
import { OPEN5E_SHA } from "../lib/source";
import { SRD_KINDS, type SrdKind } from "../lib/types";

import { createArtifactSchema, createClassSchema, createRaceSchema, createSpellGroupSchema, createSpellSchema, patchArtifactSchema, updateClassSchema, updateRaceSchema, updateSpellGroupSchema, updateSpellSchema } from "@/lib/schemas";
import { createUnitSchema, updateUnitSchema } from "@/lib/schemas/units";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { importContent } from "@/lib/server/content/import/import-content";
import type { Actor } from "@/lib/utils/api/actor";

const SCHEMAS: Record<SrdKind, { create: ZodType; update: ZodType }> = {
  "spell-groups": { create: createSpellGroupSchema, update: updateSpellGroupSchema },
  spells: { create: createSpellSchema, update: updateSpellSchema },
  races: { create: createRaceSchema, update: updateRaceSchema },
  classes: { create: createClassSchema, update: updateClassSchema },
  units: { create: createUnitSchema, update: updateUnitSchema },
  artifacts: { create: createArtifactSchema, update: patchArtifactSchema },
};

const EXPECTED: Record<SrdKind, number> = { "spell-groups": 8, spells: 339, races: 9, classes: 12, units: 331, artifacts: 39 };

const actor: Actor = { campaignId: "c1", userId: "u1", isDM: true, via: "session", scopes: null };

const data = readSrdData();

const rowsOf = (kind: SrdKind) => data[kind] as ReadonlyArray<{ slug: string; name: string }>;

describe("SRD 5.2 data files", () => {
  it("manifest: counts match the files, source pinned, credits present", () => {
    const manifest = readSrdManifest();

    expect(manifest.counts).toEqual(EXPECTED);
    expect(Object.fromEntries(SRD_KINDS.map((k) => [k, data[k].length]))).toEqual(EXPECTED);
    expect(manifest.source.sha).toBe(OPEN5E_SHA);
    expect(manifest.credits).toContain("System Reference Document 5.2");
  });

  it("every row has a srd-2024 slug, unique within its kind", () => {
    for (const kind of SRD_KINDS) {
      const slugs = rowsOf(kind).map((r) => r.slug);

      expect(slugs.every((s) => s.startsWith("srd-2024_"))).toBe(true);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it.each(SRD_KINDS)("%s: every row passes importContent dryRun with no issues and refs resolve", async (kind) => {
    const resource = { schemas: SCHEMAS[kind], invalidates: [] } as unknown as AnyContentResource;

    const report = await importContent(actor, kind, { rows: toImportRows(data[kind]), mode: "create", dryRun: true }, {
      resource: () => resource,
      loadNames: async (_c, k) => (k !== kind && (SRD_KINDS as readonly string[]).includes(k) ? rowsOf(k as SrdKind).map((r) => ({ id: `id-${r.slug}`, name: r.name })) : []),
    });

    expect(report.results.filter((r) => r.status !== "created" || r.issues.length > 0)).toEqual([]);
  });

  it("no self-targeted spell harms a creature (only Contact Other Plane, the caster's own price)", () => {
    const harmful = data.spells.filter((r) => r.targeting.kind === "self" && r.spellEffects.some((e) => e.kind === "dealDamage" || e.kind === "applyCondition")).map((r) => r.name);

    expect(harmful).toEqual(["Contact Other Plane"]);
  });

  it("a damage or heal row's dice appear in its own text", () => {
    const missing = data.spells.filter((r) => r.dice > 0 && r.spellEffects.some((e) => e.kind === "dealDamage" || e.kind === "heal") && !r.description.includes(`${r.dice}d${r.dieSides}`)).map((r) => r.name);

    expect(missing).toEqual([]);
  });

  it("unit attack residuals stay small: the engine adds ability mod and proficiency itself", () => {
    const outliers = data.units.flatMap((u) => u.attacks.filter((a) => a.attackBonus < -3 || a.attackBonus > 9).map((a) => `${u.name}/${a.name}: ${a.attackBonus}`));

    expect(outliers).toEqual([]);
  });

  it("popular spells: harmful self-range spells target enemies, Hex marks a foe, timed buffs reach the spec coverage", () => {
    const byName = (n: string) => data.spells.find((r) => r.name === n)!;

    expect(byName("Produce Flame").targeting).toEqual({ kind: "enemy", range: 60 });
    expect(byName("Vampiric Touch")).toMatchObject({ targeting: { kind: "enemy", range: 5 }, resolution: { kind: "attack" } });
    expect(byName("Sunbeam").targeting).toMatchObject({ kind: "template", shape: "line", size: 60, side: "enemy" });
    expect(byName("Hex").targeting).toEqual({ kind: "enemy", range: 90 });
    expect(byName("Hunter's Mark").targeting).toEqual({ kind: "enemy", range: 90 });
    expect(byName("Freedom of Movement")).toMatchObject({ dice: 0, targeting: { kind: "ally" }, resolution: { kind: "auto" } });
    expect(byName("Freedom of Movement").dieSides).toBeUndefined();

    const timed = data.spells.filter((r) => r.spellEffects.some((e) => (e.kind === "modifyStat" || e.kind === "flag" || e.kind === "damageBonus") && e.duration));

    expect(timed.length).toBeGreaterThanOrEqual(33);
  });

  it("monsters: multiattack sums the clauses; thrown damage keeps its flat; Dart is ranged; Octopus has no saves", () => {
    const unit = (n: string) => data.units.find((u) => u.name === n)!;

    expect(unit("Pit Fiend").multiattack).toBe(4);
    expect(unit("Tarrasque").multiattack).toBe(4);
    expect(unit("Barbed Devil").multiattack).toBe(2);
    expect(unit("Storm Giant").attacks.find((a) => a.name === "Thunderbolt")!.damageDice).toBe("2d12+7");
    expect(unit("Octopus").saveProficiencies).toEqual([]);
    expect(data.artifacts.find((a) => a.name === "Dart")).toMatchObject({ slot: "range_weapon", weapon: { attackType: "ranged" } });
  });
});
