import { describe, expect, it } from "vitest";

import { mainSkillRoleByName } from "../main-skill-role-by-name";

describe("mainSkillRoleByName", () => {
  it.each([
    ["Магія Світла", "magic"],
    ["магія_хаосу", "magic"],
    ["Природа", "magic"],
    ["Персональні", "personal"],
    ["Щось", null],
  ])("%s → %s", (name, role) => expect(mainSkillRoleByName(name)).toBe(role));
});
