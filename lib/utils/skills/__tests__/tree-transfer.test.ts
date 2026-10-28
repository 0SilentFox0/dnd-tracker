import { describe, expect, it } from "vitest";

import { exportSkillTrees, isTreeImportFailure, planSkillTreeImport, readSkillTreeFiles, SKILL_TREE_FILE_FORMAT } from "../tree-transfer";

const TREE = {
  race: "Ельфи",
  skills: {
    id: "old-row",
    race: "Ельфи",
    mainSkills: [
      { id: "m1", name: "Напад", levelSkillIds: { basic: "s1" }, levels: { basic: { circle1: [{ id: "s2" }] } } },
      { id: "racial", name: "Раса", levels: {} },
    ],
    ultimateSkill: { id: "s3" },
  },
};

const SOURCE = {
  mainSkills: [{ id: "m1", name: "Напад" }],
  skills: [{ id: "s1", name: "Основи" }, { id: "s2", name: "Удар" }, { id: "s3", name: "Ультимат" }, { id: "s9", name: "Зайвий" }],
};

describe("exportSkillTrees", () => {
  it("додає словник назв лише для використаних id з видом запису", () => {
    const [file] = exportSkillTrees([TREE], SOURCE);

    expect(file.format).toBe(SKILL_TREE_FILE_FORMAT);
    expect(file.names).toEqual({
      m1: { name: "Напад", kind: "mainSkill" },
      s1: { name: "Основи", kind: "skill" },
      s2: { name: "Удар", kind: "skill" },
      s3: { name: "Ультимат", kind: "skill" },
    });
  });
});

describe("planSkillTreeImport", () => {
  const [file] = exportSkillTrees([TREE], SOURCE);

  const target = {
    races: [{ id: "r1", name: "ельфи" }],
    trees: [{ id: "t1", race: "ельфи" }],
    mainSkills: [{ id: "M1", name: "напад" }],
    skills: [{ id: "S7", name: "Напад" }, { id: "S1", name: "основи" }, { id: "S2", name: "Удар" }, { id: "S3", name: "Ультимат" }],
  };

  it("чужі id замінюються за назвою з урахуванням виду; id/race дерева прибираються; наявне дерево раси оновлюється", () => {
    const plan = planSkillTreeImport(file, target);

    expect(plan).toEqual({
      race: "ельфи",
      treeId: "t1",
      skills: {
        mainSkills: [
          { id: "M1", name: "Напад", levelSkillIds: { basic: "S1" }, levels: { basic: { circle1: [{ id: "S2" }] } } },
          { id: "racial", name: "Раса", levels: {} },
        ],
        ultimateSkill: { id: "S3" },
      },
    });
  });

  it("нове дерево — treeId new; та сама кампанія — id без змін", () => {
    const plan = planSkillTreeImport(file, { races: [{ id: "r", name: "Ельфи" }], trees: [], ...SOURCE });

    expect(plan).toMatchObject({ treeId: "new", skills: { ultimateSkill: { id: "s3" } } });
  });

  it("немає раси або скіла — помилка з назвами", () => {
    expect(planSkillTreeImport(file, { ...target, races: [] })).toEqual({ race: "Ельфи", error: "Раси «Ельфи» немає в кампанії" });

    const missing = planSkillTreeImport(file, { ...target, skills: target.skills.filter((s) => s.id !== "S2") });

    expect(isTreeImportFailure(missing) && missing.error).toBe("Не знайдено в кампанії: Удар");
  });
});

describe("readSkillTreeFiles", () => {
  it("масив або один файл; інше — помилка", () => {
    const [file] = exportSkillTrees([TREE], SOURCE);

    expect(readSkillTreeFiles(JSON.stringify([file, file]))).toHaveLength(2);
    expect(readSkillTreeFiles(JSON.stringify(file))).toHaveLength(1);
    expect(() => readSkillTreeFiles('{"race":"Ельфи"}')).toThrow("Файл не схожий на експорт дерев скілів");
    expect(() => readSkillTreeFiles("[]")).toThrow("Файл не схожий на експорт дерев скілів");
    expect(() => readSkillTreeFiles("{oops")).toThrow("Некоректний JSON");
  });
});

describe("spellGroupId", () => {
  const withGroup = { race: "Ельфи", skills: { mainSkills: [{ id: "m1", spellGroupId: "g1" }, { id: "m2", spellGroupId: "gX" }] } };

  const source = { mainSkills: [{ id: "m1", name: "Напад" }, { id: "m2", name: "Захист" }], skills: [], spellGroups: [{ id: "g1", name: "Вогонь" }] };

  const [file] = exportSkillTrees([withGroup], source);

  const target = { races: [{ id: "r", name: "Ельфи" }], trees: [], mainSkills: [{ id: "M1", name: "Напад" }, { id: "M2", name: "Захист" }], skills: [] };

  it("експорт додає школи у словник назв", () => {
    expect(file.names.g1).toEqual({ name: "Вогонь", kind: "spellGroup" });
  });

  it("школа переноситься за назвою, невідома прибирається з попередженням", () => {
    const plan = planSkillTreeImport(file, { ...target, spellGroups: [{ id: "G9", name: "вогонь" }] });

    expect(plan).toMatchObject({ skills: { mainSkills: [{ id: "M1", spellGroupId: "G9" }, { id: "M2" }] }, warnings: [expect.stringContaining("gX")] });
  });

  it("школи немає в цільовій кампанії — поле прибрано з попередженням", () => {
    const plan = planSkillTreeImport(file, target);

    expect(plan).toMatchObject({ skills: { mainSkills: [{ id: "M1" }, { id: "M2" }] }, warnings: [expect.stringContaining("Вогонь")] });
  });

  it("школа тієї ж кампанії лишається", () => {
    const plan = planSkillTreeImport(file, { ...target, mainSkills: source.mainSkills, spellGroups: [{ id: "g1", name: "Вогонь" }] });

    expect(plan).toMatchObject({ skills: { mainSkills: [{ id: "m1", spellGroupId: "g1" }, { id: "m2" }] } });
  });
});
