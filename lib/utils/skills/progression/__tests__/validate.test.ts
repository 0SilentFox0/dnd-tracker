import { describe, expect, it } from "vitest";

import { validateTree } from "..";
import { RAW } from "./fixtures";

const ALL_SKILLS = new Set(["atk-b", "atk-a", "atk-e", "o1", "o2", "o3", "m1", "m2", "i1", "def-b", "d-o1", "d-o2", "d-m1", "d-i1", "l-o1", "l-i1", "c-o1", "c-m1", "c-i1", "r-b", "r-a", "ult"]);

const CTX = { mainSkillIds: new Set(["attack", "defense", "light", "chaos"]), skillIds: ALL_SKILLS };

describe("validateTree", () => {
  it("валідне дерево — без помилок (racial/ultimate — не невідомі гілки)", () => {
    expect(validateTree(RAW, CTX)).toEqual([]);
  });

  it("дубль скіла між рівнем і слотом", () => {
    const raw = { ...RAW, mainSkills: RAW.mainSkills.map((b) => (b.id === "defense" ? { ...b, levelSkillIds: { basic: "o1" } } : b)) };

    expect(validateTree(raw, CTX)).toContainEqual({ code: "duplicateSkill", ref: "o1" });
  });

  it("невідома гілка, невідомий скіл, дубль гілки", () => {
    const raw = { ...RAW, mainSkills: [...RAW.mainSkills, { id: "ghost", name: "?", color: "x" }, RAW.mainSkills[0]] };

    const codes = validateTree(raw, { ...CTX, skillIds: new Set([...ALL_SKILLS].filter((id) => id !== "ult")) }).map((e) => `${e.code}:${e.ref}`);

    expect(codes).toEqual(expect.arrayContaining(["unknownBranch:ghost", "duplicateBranch:attack", "unknownSkill:ult"]));
  });

  it("плейсхолдери ігноруються", () => {
    const raw = { ...RAW, ultimateSkill: { id: "Ельф_ultimate" } };

    expect(validateTree(raw, CTX)).toEqual([]);
  });
});
