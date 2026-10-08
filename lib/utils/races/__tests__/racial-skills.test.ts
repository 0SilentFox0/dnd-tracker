import { describe, expect, it } from "vitest";

import { raceRacialSkills } from "@/lib/utils/races/racial-skills";

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
    expect(raceRacialSkills(null, skills)).toEqual({ levels: [], ultimate: null });

    const out = raceRacialSkills({ mainSkills: [{ id: "racial", levelSkillIds: { basic: "placeholder_x", advanced: "nope", expert: "f" } }], ultimateSkill: null }, [{ id: "f", name: "Плоский", description: "d" }]);

    expect(out.levels).toEqual([{ id: "f", name: "Плоский", description: "d", appearanceDescription: "", level: "expert" }]);
    expect(out.ultimate).toBeNull();
  });
});
