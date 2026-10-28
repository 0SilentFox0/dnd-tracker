import { describe, expect, it } from "vitest";

import { importSrdData, resolveSchoolRefs } from "../lib/load-template";
import type { SrdData } from "../lib/types";

describe("resolveSchoolRefs", () => {
  it("replaces school names with group ids anywhere in a row, leaves unknown names", () => {
    const rows = [{ name: "Wizard", subclasses: [{ features: [{ abilities: [{ effects: [{ kind: "damageBonus", filter: { kind: "magic", school: "Evocation" } }, { kind: "flag", flag: "spellAbsorb", school: "Necromancy", percent: 50 }] }] }] }] }];

    const out = resolveSchoolRefs(rows, new Map([["Evocation", "g-evo"]]));

    expect(JSON.stringify(out)).toContain('"school":"g-evo"');
    expect(JSON.stringify(out)).toContain('"school":"Necromancy"');
    expect(JSON.stringify(rows)).toContain('"school":"Evocation"');
  });

  it("importSrdData passes rows through prepare in kind order", async () => {
    const data = { "spell-groups": [{ slug: "g", name: "G" }], spells: [], races: [], classes: [{ slug: "c", name: "C" }], feats: [], backgrounds: [], units: [], artifacts: [] } as unknown as SrdData;

    const seen: string[] = [];

    await importSrdData(
      data,
      async (kind, rows) => {
        seen.push(`${kind}:${JSON.stringify(rows)}`);

        return { counts: { created: 0, updated: 0, skipped: 0, error: 0 }, results: [] } as never;
      },
      async (kind, rows) => (kind === "classes" ? rows.map((r) => ({ ...r, prepared: true })) : rows),
    );

    expect(seen.find((s) => s.startsWith("classes"))).toBe('classes:[{"name":"C","prepared":true}]');
    expect(seen.find((s) => s.startsWith("spell-groups"))).toBe('spell-groups:[{"name":"G"}]');
  });
});
