import { describe, expect, it, vi } from "vitest";

import { contentDeleteCascades, contentDependencies } from "@/lib/server/assistant/actions/content-dependencies";
import { snapshotHash } from "@/lib/server/assistant/actions/content-snapshot";

// The current bundle contains optional SetNull relations. Exercise the remaining
// DMMF branches with synthetic metadata, without changing Prisma or the DB.
vi.mock("@prisma/client", async importOriginal => {
  const actual = await importOriginal<typeof import("@prisma/client")>();

  const dmmf = actual.Prisma.dmmf;

  return { ...actual, Prisma: { ...actual.Prisma, dmmf: { ...dmmf, datamodel: { ...dmmf.datamodel, models: dmmf.datamodel.models.map(model => {
    if (model.name !== "CampaignTrack") return model;

    const relation = model.fields.find(field => field.kind === "object");

    if (!relation) throw new Error("EXPECTED_RELATION_METADATA");

    return { ...model, fields: [...model.fields, ...[
      { name: "cascade", column: "cascadeId", onDelete: "Cascade", required: false },
      { name: "restrict", column: "restrictId", onDelete: "Restrict", required: true },
      { name: "defaultRequired", column: "requiredId", onDelete: undefined, required: true },
      { name: "defaultOptional", column: "optionalId", onDelete: undefined, required: false },
    ].map(spec => ({ ...relation, name: spec.name, type: "Artifact", relationFromFields: [spec.column], relationOnDelete: spec.onDelete, isRequired: spec.required }))] };
  }) } } } };
});

describe("full snapshot dependency projections", () => {
  it("preserves nested choices, JSON itemStats, object keys, composite segments and row order", () => {
    const spell = { id: "spell", name: "Магія" };

    const incoming = { id: "race", name: "Людина" };

    const choices = { id: "hero", choices: { nested: [{ spell: { selected: true } }] } };

    const stats = { id: "stats", effects: [{ type: "itemStats", value: '{"spells":[{"spellId":"spell"}]}' }] };

    const composite = { id: "item", equipped: "base+property+spell" };

    const state = {
      tables: { spells: [spell, { id: "other", name: "Інше" }], races: [incoming], artifacts: [stats], notRows: null },
      characters: [choices, { id: "unrelated" }, { id: "race-hero", race: "race" }],
      inventory: [composite], campaign: { rules: {} },
    };

    const before = structuredClone(state);

    expect(contentDependencies(state, "spells", "spell", { nested: { raceId: "race" } })).toEqual({
      tables: { spells: [spell], races: [incoming], artifacts: [stats], notRows: [] },
      characters: [choices, { id: "race-hero", race: "race" }], inventory: [composite],
    });
    expect(state).toEqual(before);
  });

  it("keeps aliases, all IDs, name-valued legacy IDs and incoming exact references", () => {
    const state = { tables: { spellGroups: [{ id: "Школа", name: "Школа" }], spells: [{ id: "s", groupId: "Школа" }], mainSkills: [{ id: "m" }], artifactSets: [{ id: "a" }] }, characters: [{ id: "hero", choices: { group: "Школа" } }] };

    expect(contentDependencies(state, "spell-groups", undefined, null)).toEqual({ tables: { spellGroups: state.tables.spellGroups, spells: state.tables.spells, mainSkills: [], artifactSets: [] }, characters: state.characters });
    expect(contentDependencies(state, "main-skills", "m", null)).toMatchObject({ tables: { mainSkills: [{ id: "m" }] } });
    expect(contentDependencies(state, "artifact-sets", "a", null)).toMatchObject({ tables: { artifactSets: [{ id: "a" }] } });
    expect(contentDependencies(null, "spells", undefined, null)).toEqual({});
  });

  it("preserves SetNull cascade order by table, relation, then snapshot row", () => {
    const state = { tables: {
      spellGroups: [{ id: "g", name: "Школа" }],
      spells: [{ id: "s2", name: "Друге", groupId: "g" }, { id: "s1", name: "Перше", groupId: "g" }],
      skills: [{ id: "k", name: "Скіл", spellGroupId: "g", spellId: "s1", spellNewSpellId: "s1", grantedSpellId: "s1" }],
      mainSkills: [{ id: "main", name: "Головний", spellGroupId: "g" }],
    } };

    expect(contentDeleteCascades(state, "spell-groups", ["g"])).toEqual([
      { target: { domain: "spells", id: "s2", name: "Друге" }, path: "groupId", before: "g", after: null },
      { target: { domain: "spells", id: "s1", name: "Перше" }, path: "groupId", before: "g", after: null },
      { target: { domain: "mainSkills", id: "main", name: "Головний" }, path: "spellGroupId", before: "g", after: null },
      { target: { domain: "skills", id: "k", name: "Скіл" }, path: "spellGroupId", before: "g", after: null },
    ]);
    expect(contentDeleteCascades(state, "spells", ["s1"])).toEqual(["spellId", "spellNewSpellId", "grantedSpellId"].map(path => ({ target: { domain: "skills", id: "k", name: "Скіл" }, path, before: "s1", after: null })));
    expect(contentDeleteCascades(state, "unknown", ["g"])).toEqual([]);
  });

  it("retains Cascade, explicit Restrict and required/optional defaults in metadata order", () => {
    const cascade = { id: "c", title: "Каскад", cascadeId: "a" };

    const optional = { id: "o", optionalId: "a" };

    const state = { tables: { tracks: [cascade, { id: "r", restrictId: "a" }, { id: "required", requiredId: "a" }, optional] } };

    expect(contentDeleteCascades(state, "artifacts", ["a"])).toEqual([
      { target: { domain: "tracks", id: "c", name: "Каскад" }, path: "$record", before: cascade, after: null },
      { target: { domain: "tracks", id: "o", name: "o" }, path: "optionalId", before: "a", after: null },
    ]);
    expect(contentDependencies(state, "artifacts", "a", null)).toEqual(state);
  });

  it("never hides unrelated changes from the authoritative hash", () => {
    const state = { tables: { spells: [{ id: "s" }], artifacts: [{ id: "a", description: "old" }] } };

    const projection = contentDependencies(state, "spells", "s", null);

    const before = snapshotHash(state);

    state.tables.artifacts[0].description = "new";
    expect(contentDependencies(state, "spells", "s", null)).toEqual(projection);
    expect(snapshotHash(state)).not.toBe(before);
  });
});
