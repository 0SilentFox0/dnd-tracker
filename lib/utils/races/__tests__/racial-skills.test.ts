import { describe, expect, it } from "vitest";

import { countTreeSkills, raceRacialSkills } from "@/lib/utils/races/racial-skills";

const grouped = (id: string, name: string) => ({ id, basicInfo: { name, description: `d-${id}` }, appearanceDescription: `a-${id}` });

describe("raceRacialSkills", () => {
  const tree = {
    mainSkills: [{ id: "attack", name: "A", color: "#fff" }, { id: "racial", name: "Раса", color: "x", levelSkillIds: { basic: "s1", advanced: "s2", expert: "s3" } }],
    ultimateSkill: { id: "u1" },
  };

  const skills = [grouped("s1", "Один"), grouped("s2", "Два"), grouped("s3", "Три"), grouped("u1", "Ульт")];

  it("collects three racial levels and the ultimate with descriptions", () => {
    const out = raceRacialSkills(tree, skills);

    expect(out.levels.map((l) => [l.level, l.name, l.description, l.appearanceDescription])).toEqual([
      ["basic", "Один", "d-s1", "a-s1"],
      ["advanced", "Два", "d-s2", "a-s2"],
      ["expert", "Три", "d-s3", "a-s3"],
    ]);
    expect(out.ultimate?.name).toBe("Ульт");
  });

  it("skips placeholders, unknown skills and empty trees; reads flat skill rows", () => {
    expect(raceRacialSkills(null, skills)).toEqual({ levels: [], ultimate: null, treeSkillCount: null });

    const out = raceRacialSkills({ mainSkills: [{ id: "racial", levelSkillIds: { basic: "placeholder_x", advanced: "nope", expert: "f" } }], ultimateSkill: null }, [{ id: "f", name: "Плоский", description: "d" }]);

    expect(out.levels).toEqual([{ id: "f", name: "Плоский", description: "d", appearanceDescription: "", level: "expert" }]);
    expect(out.ultimate).toBeNull();
  });
});

describe("countTreeSkills", () => {
  it("counts distinct skills: branch levels, slots, racial levels, ultimate", () => {
    const branch = (id: string, n: number) => ({
      id,
      levelSkillIds: { basic: `${id}-1`, advanced: `${id}-2`, expert: `${id}-3` },
      levels: { basic: { circle3: [1, 2, 3].map((i) => ({ id: `${id}-o${i}` })), circle2: [1, 2].map((i) => ({ id: `${id}-m${i}` })), circle1: [{ id: `${id}-i1` }] } },
      n,
    });

    const tree = { mainSkills: [branch("a", 0), branch("b", 0), { id: "racial", levelSkillIds: { basic: "r1", advanced: "r2", expert: "r3" } }], ultimateSkill: { id: "u" } };

    expect(countTreeSkills(tree)).toBe(2 * 9 + 4);
    expect(countTreeSkills({ mainSkills: [], ultimateSkill: null })).toBe(0);
  });
});
