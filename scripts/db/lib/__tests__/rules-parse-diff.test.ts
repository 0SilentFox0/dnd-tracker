import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { diffRules, summarize } from "../rules-parse-diff";

const srd = JSON.parse(readFileSync(join(process.cwd(), "data/templates/srd-5.2/rules.json"), "utf8")) as Record<string, unknown>;

describe("diffRules", () => {
  it("reports no differences for a template", () => {
    expect(diffRules(srd).differences).toEqual([]);
  });

  it("labels an unknown sub-key difference as by design with a section.item path", () => {
    const { differences } = diffRules({ ...srd, saves: { proficiency: true, bogus: 1 } });

    expect(differences.length).toBeGreaterThan(0);
    expect(differences.every((d) => d.path.startsWith("saves") && d.byDesign)).toBe(true);
  });

  it("labels an invalid custom condition as by design", () => {
    const { differences } = diffRules({ ...srd, conditions: { enabled: true, exhaustion: "2014", custom: [{ key: "BAD KEY", name: "", description: "", markers: [] }] } });

    expect(differences.some((d) => d.path.startsWith("conditions") && d.byDesign)).toBe(true);
  });

  it("returns the resolved system key", () => {
    expect(diffRules(srd).system).toBe("dnd5e");
  });
});

describe("summarize", () => {
  it("counts by design and unexplained separately per path", () => {
    const summary = summarize([
      { id: "a", source: "campaign", system: "dnd5e", differences: [{ path: "saves.x", legacy: 1, next: 2, byDesign: "why" }, { path: "morale.cap", legacy: 1, next: 2 }] },
      { id: "b", source: "template", system: "homm", differences: [{ path: "morale.cap", legacy: 3, next: 4 }] },
    ]);

    expect(summary).toEqual({
      total: 2,
      byDesign: 1,
      unexplained: 2,
      perPath: { "morale.cap": { byDesign: 0, unexplained: 2 }, "saves.x": { byDesign: 1, unexplained: 0 } },
    });
  });
});
