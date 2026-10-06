import { describe, expect, it } from "vitest";

import { DPR_BY_LEVEL_MAGIC, DPR_BY_LEVEL_NON_MAGIC } from "@/lib/constants/dpr-by-main-skill";
import { getNonMagicBranchDpr, getSpellDprFromBranchLevels } from "@/lib/utils/battle/balance/dpr";

describe("DPR з рівнів гілок", () => {
  const magic = new Set(["light"]);

  it("магія — найвищий рівень серед магічних гілок", () => {
    expect(getSpellDprFromBranchLevels({ light: "advanced", attack: "expert" }, magic)).toBe(DPR_BY_LEVEL_MAGIC.advanced);
  });

  it("немагічні — сума", () => {
    expect(getNonMagicBranchDpr({ light: "advanced", attack: "expert", defense: "basic" }, magic)).toBe(DPR_BY_LEVEL_NON_MAGIC.expert + DPR_BY_LEVEL_NON_MAGIC.basic);
  });
});
