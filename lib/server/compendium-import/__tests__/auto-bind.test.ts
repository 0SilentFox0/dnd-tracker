import { describe, expect, it } from "vitest";

import { findByName, matchCampaignRows, matchTemplateRows, pendingRefs } from "../auto-bind";
import { canonicalKey } from "../identity";
import type { AdaptedEntry } from "../types";

const entry = (over: Partial<AdaptedEntry>): AdaptedEntry => ({ key: "k", inputKind: "monster", kind: "units", source: "S", edition: "classic", name: "Owner", body: {}, refs: [], notes: "", issues: [], ...over });

describe("auto-bind helpers", () => {
  it("matches names case-insensitively with normalized apostrophes and spaces", () => {
    const rows = [{ id: "1", name: "Tasha’s  Caustic Brew" }];

    expect(findByName(rows, "tasha's caustic brew")?.id).toBe("1");
    expect(findByName(rows, "Nope")).toBeUndefined();
  });

  it("lists only refs that are neither in the file, known, nor satisfied by a same-name entry", () => {
    const ref = (name: string) => ({ path: ["spellcasting"], kind: "spell", name, source: "PHB", edition: "classic" as const });

    const own = entry({ key: canonicalKey("spell", "Jolt", "PHB", "classic", undefined), kind: "spells", name: "Jolt", source: "PHB", inputKind: "spell" });

    const owner = entry({ refs: [ref("Fog Cloud"), ref("Jolt"), ref("Known"), ref("fog cloud")] });

    const known = canonicalKey("spell", "Known", "PHB", "classic");

    const pending = pendingRefs([own, owner], (key) => key === known);

    expect(pending).toHaveLength(1);
    expect(pending[0].ref.name.toLowerCase()).toBe("fog cloud");
    expect(pending.every((p) => p.kind === "spells")).toBe(true);
  });

  it("keeps auto-binding for a same-name file entry of another source or edition", () => {
    const ref = (name: string, source: string, edition: "classic" | "one") => ({ path: ["spellcasting"], kind: "spell", name, source, edition });

    const homebrew = entry({ key: canonicalKey("spell", "Fireball", "HB", "classic"), kind: "spells", name: "Fireball", source: "HB", inputKind: "spell" });

    const oneEd = entry({ key: canonicalKey("spell", "Haste", "PHB", "one"), kind: "spells", name: "Haste", source: "PHB", edition: "one", inputKind: "spell" });

    const owner = entry({ refs: [ref("Fireball", "PHB", "classic"), ref("Haste", "PHB", "classic")] });

    expect(pendingRefs([homebrew, oneEd, owner], () => false).map((p) => p.ref.name).sort()).toEqual(["Fireball", "Haste"]);
  });

  it("marks merge-parent refs and auto-binds them only to rows with an import record", () => {
    const parent = { path: [], kind: "class", name: "Wizard", source: "PHB", edition: "classic" as const };

    const sub = entry({ kind: "classes", inputKind: "subclass", refs: [], mergeParent: parent });

    const pending = pendingRefs([sub], () => false);

    expect(pending).toMatchObject([{ parent: true }]);

    const names = { classes: [{ id: "mine", name: "Wizard" }] };

    expect(matchCampaignRows(pending, names, () => false)).toEqual([]);
    expect(matchCampaignRows(pending, names, (kind, id) => kind === "classes" && id === "mine")).toHaveLength(1);

    const read = pendingRefs([entry({ refs: [{ ...parent, kind: "spell", name: "Wizard" }] })], () => false);

    expect(matchCampaignRows(read, { spells: [{ id: "s", name: "Wizard" }] }, () => false)).toHaveLength(1);
  });

  it("binds SRD rows by name only for edition 2024 refs unless mixed editions are allowed", () => {
    const pending = (edition: "classic" | "one") => pendingRefs([entry({ refs: [{ path: [], kind: "spell", name: "Fog Cloud", source: "PHB", edition }] })], () => false);

    const names = { spells: [{ id: "srd-fog", name: "Fog Cloud" }] };

    expect(matchTemplateRows(pending("one"), names, false)).toHaveLength(1);
    expect(matchTemplateRows(pending("classic"), names, false)).toEqual([]);
    expect(matchTemplateRows(pending("classic"), names, true)).toMatchObject([{ row: { id: "srd-fog" } }]);
    expect(matchTemplateRows(pending("one"), { spells: [] }, true)).toEqual([]);
  });
});
