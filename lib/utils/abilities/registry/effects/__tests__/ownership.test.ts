import { describe, expect, it } from "vitest";

import { effectKey, effectKindsOf, filterEffectsInComposition, isEffectInComposition, ownershipOf } from "../ownership";
import { SYSTEM_EFFECT_OWNERSHIP, SYSTEM_EFFECT_ROWS } from "../system-rows";

const own = ownershipOf([{ kind: "wfrpWard", system: "wfrp" }, { kind: "changeMorale", system: "morale" }], { moraleChance: "morale" });

describe("effect ownership", () => {
  it("every generated row carries its owning module", () => {
    expect(SYSTEM_EFFECT_ROWS.every((r) => r.system === "wfrp")).toBe(true);
    expect(SYSTEM_EFFECT_OWNERSHIP.kinds.wfrpWard).toBe("wfrp");
  });

  it("effectKindsOf lists only the owned keys of active modules", () => {
    expect([...effectKindsOf({ base: "d20", modules: ["morale"] }, own)].sort()).toEqual(["changeMorale", "flag:moraleChance"]);
    expect([...effectKindsOf({ base: "d20", modules: [] }, own)]).toEqual([]);
    expect([...effectKindsOf({ base: "wfrp", modules: [] }, own)]).toEqual(["wfrpWard"]);
  });

  it("unowned (core) effects are always in, owned ones need their module", () => {
    const bare = { base: "d20", modules: [] };

    expect(isEffectInComposition({ kind: "heal" }, bare, own)).toBe(true);
    expect(isEffectInComposition({ kind: "flag", flag: "advantage" }, bare, own)).toBe(true);
    expect(isEffectInComposition({ kind: "flag", flag: "moraleChance" }, bare, own)).toBe(false);
    expect(isEffectInComposition({ kind: "flag", flag: "moraleChance" }, { base: "d20", modules: ["morale"] }, own)).toBe(true);
    expect(isEffectInComposition({ kind: "wfrpWard" }, bare, own)).toBe(false);
  });

  it("filter drops inactive effects without touching the input", () => {
    const effects = [{ kind: "heal" }, { kind: "flag", flag: "moraleChance" }];

    expect(filterEffectsInComposition(effects, { base: "d20", modules: [] }, own)).toEqual([{ kind: "heal" }]);
    expect(effects).toHaveLength(2);
    expect(effectKey(effects[1])).toBe("flag:moraleChance");
  });
});
