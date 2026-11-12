import { describe, expect, it } from "vitest";

import { partsOf, rowViolations } from "@/lib/utils/abilities/ownership-report";
import { composition } from "@/lib/utils/rules/systems/catalog";

const BARE = composition({ key: "dnd5e" });

const HOMM = composition({ key: "homm" });

const WFRP = composition({ key: "wfrp" });

const passive = { id: "a", name: "A", trigger: { event: "passive" } };

const row = (effects: unknown[], extra: Record<string, unknown> = {}, table = "units") => ({ table, id: "r1", data: { abilities: [{ ...passive, effects }], ...extra } });

describe("rowViolations", () => {
  it("core effects pass anywhere", () => {
    expect(rowViolations(row([{ kind: "heal", trigger: undefined, amount: 1 }]), BARE)).toEqual([]);
  });

  it("morale flag and changeMorale need the morale module", () => {
    const effects = [{ kind: "flag", flag: "moraleChance", value: 10 }, { kind: "changeMorale", delta: 1 }];

    expect(rowViolations(row(effects), BARE).map((v) => [v.path, v.kind, v.reason])).toEqual([
      ["abilities[0].effects[0]", "flag:moraleChance", "effect"],
      ["abilities[0].effects[1]", "changeMorale", "effect"],
    ]);
    expect(rowViolations(row(effects), HOMM).filter((v) => v.reason === "effect")).toEqual([]);
  });

  it("looks inside randomOf options", () => {
    const v = rowViolations(row([{ kind: "randomOf", options: [{ kind: "changeMorale", delta: 1 }] }]), BARE);

    expect(v).toContainEqual(expect.objectContaining({ path: "abilities[0].effects[0].options[0]", kind: "changeMorale", reason: "effect" }));
  });

  it("formula variable of an inactive module is a violation", () => {
    const effects = [{ kind: "modifyStat", stat: "armor", flat: { formula: "morale + 1" } }];

    expect(rowViolations(row(effects), BARE)).toContainEqual(expect.objectContaining({ kind: "morale", reason: "variable" }));
    expect(rowViolations(row(effects), HOMM).filter((v) => v.reason === "variable")).toEqual([]);
  });

  it("wfrp effects are outside dnd5e but inside wfrp", () => {
    expect(rowViolations(row([{ kind: "wfrpWard", value: 9 }]), BARE).filter((v) => v.reason === "effect")).toHaveLength(1);
    expect(rowViolations(row([{ kind: "wfrpWard", value: 9 }]), WFRP).filter((v) => v.reason === "effect")).toEqual([]);
  });

  it("skill and artifact-set rows need their module", () => {
    const data = { abilities: [{ ...passive, effects: [{ kind: "note", text: "x" }] }] };

    expect(rowViolations({ table: "skills", id: "s", source: "skill", data }, BARE)).toContainEqual(expect.objectContaining({ reason: "source", kind: "skill" }));
    expect(rowViolations({ table: "skills", id: "s", source: "skill", data }, HOMM)).toEqual([]);
    expect(rowViolations({ table: "artifact_sets", id: "s", source: "artifactSet", data: { abilities: [] } }, BARE)).toEqual([]);
  });

  it("reports rows that fail the ability schema without touching them", () => {
    expect(rowViolations(row([{ kind: "nope" }]), HOMM)).toContainEqual(expect.objectContaining({ path: "abilities[0]", reason: "schema" }));
  });
});

describe("partsOf", () => {
  it("class abilities live in features and subclass features", () => {
    const parts = partsOf("classes", { features: [{ abilities: [1] }], subclasses: [{ features: [{ abilities: [2] }] }] });

    expect(parts.map((p) => p.path)).toEqual(["features[0].abilities", "subclasses[0].features[0].abilities"]);
  });

  it("spells carry a bare effect list", () => {
    expect(partsOf("spells", { spellEffects: [{ kind: "heal" }] })).toEqual([{ path: "spellEffects", abilities: [{ effects: [{ kind: "heal" }] }] }]);
  });
});
