import { describe, expect, it } from "vitest";

import { cellSkillId, normalizeTree, RACIAL_BRANCH_ID, setCellSkill } from "..";
import { RAW } from "./fixtures";

const renamed = (name: string) => ({ ...RAW, mainSkills: RAW.mainSkills.map((b) => (b.id === RACIAL_BRANCH_ID ? { ...b, name } : b)) });

describe("псевдогілка раси", () => {
  it("стара uk-назва і нова працюють однаково (порівняння за id)", () => {
    const [uk, en] = ["Раса", "Race"].map((name) => renamed(name));

    expect(normalizeTree({ id: "t", race: "Ельф", skills: uk })).toEqual(normalizeTree({ id: "t", race: "Ельф", skills: en }));

    const ref = { kind: "racial", level: "expert" } as const;

    expect(cellSkillId(setCellSkill(uk, ref, { id: "rx", name: "x" }), ref)).toBe(cellSkillId(setCellSkill(en, ref, { id: "rx", name: "x" }), ref));
  });
});
