import { describe, expect, it } from "vitest";

import { isMagicMainSkill, magicMainSkillIds } from "@/lib/utils/battle/balance";
import { getNonMagicBranchDpr } from "@/lib/utils/battle/balance/dpr";

describe("школа магії", () => {
  it("за slug-ідентифікатором", () => {
    expect(isMagicMainSkill({ id: "sorcery" })).toBe(true);
  });

  it("за назвою, без регістру й зайвих пробілів", () => {
    expect(isMagicMainSkill({ id: "cuid1", name: "Магія світла" })).toBe(true);
    expect(isMagicMainSkill({ id: "cuid2", name: "  Магія   Хаосу " })).toBe(true);
    expect(isMagicMainSkill({ id: "cuid3", name: "Напад" })).toBe(false);
  });

  it("набір ідентифікаторів магічних шкіл кампанії", () => {
    expect(magicMainSkillIds([{ id: "a", name: "Магія темряви" }, { id: "b", name: "Захист" }, { id: "light_magic", name: "Світло" }])).toEqual(new Set(["a", "light_magic"]));
  });

  it("DPR без набору кампанії все одно впізнає slug", () => {
    expect(getNonMagicBranchDpr({ sorcery: "expert" }, null)).toBe(0);
  });
});
