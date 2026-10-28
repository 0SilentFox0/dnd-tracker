import { describe, expect, it } from "vitest";

import { findByName, pendingRefs } from "../auto-bind";
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

    const own = entry({ key: canonicalKey("spell", "Jolt", "S", "classic"), kind: "spells", name: "Jolt", inputKind: "spell" });

    const owner = entry({ refs: [ref("Fog Cloud"), ref("Jolt"), ref("Known"), ref("fog cloud")] });

    const known = canonicalKey("spell", "Known", "PHB", "classic");

    const pending = pendingRefs([own, owner], (key) => key === known);

    expect(pending).toHaveLength(1);
    expect(pending[0].ref.name.toLowerCase()).toBe("fog cloud");
    expect(pending.every((p) => p.kind === "spells")).toBe(true);
  });
});
