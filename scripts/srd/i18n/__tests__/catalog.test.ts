import { describe, expect, it } from "vitest";

import type { SrdData } from "../../lib/types";
import { extractCatalog, hashText } from "../catalog";

const data = (over: Record<string, unknown[]>) => ({ "spell-groups": [], spells: [], races: [], classes: [], feats: [], backgrounds: [], units: [], artifacts: [], ...over }) as unknown as SrdData;

describe("extractCatalog", () => {
  it("дедуплікує однакові тексти й збирає види", () => {
    const entries = extractCatalog(data({ feats: [{ slug: "f", name: "Alert", description: "Stay alert and ready" }], races: [{ slug: "r", name: "Elf", abilities: [{ id: "a", name: "Alert", description: "Stay alert and ready" }] }] }));

    expect(entries.map((e) => e.en).sort()).toEqual(["Alert", "Elf", "Stay alert and ready"]);
    expect(entries.find((e) => e.en === "Alert")?.kinds.sort()).toEqual(["feats", "races"]);
  });

  it("пропускає рядки без слів і не бере slug та id", () => {
    const entries = extractCatalog(data({ spells: [{ slug: "srd_fireball", name: "Fireball", description: "1d6", abilities: [{ id: "breath-weapon", text: "+5" }] }] }));

    expect(entries.map((e) => e.en)).toEqual(["Fireball"]);
  });

  it("розрізняє клас name і description з однаковим текстом", () => {
    expect(hashText("n", "Light")).not.toBe(hashText("d", "Light"));
  });
});
