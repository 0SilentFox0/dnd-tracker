import { describe, expect, it } from "vitest";

import { textOf } from "@/lib/i18n/test/text";
import { dynamicTextRef } from "@/lib/i18n/text-ref";
import { CONDITION_5E_REGISTRY, exhaustionEffects, expandCondition5e } from "@/lib/utils/battle/conditions";
import { conditionEffectInput } from "@/lib/utils/battle/conditions/registry";
import type { TextRef } from "@/types/text";

const types = (m: { type: string }[]) => m.map((x) => x.type).sort();

describe("CONDITION_5E_REGISTRY", () => {
  it("paralyzed implies incapacitated and immobile", () => {
    const { markers, flags } = expandCondition5e("paralyzed", { exhaustion: "2014" });

    expect(types(markers)).toEqual(["immobilized", "incapacitated", "no_bonus_action", "no_reaction", "paralyzed", "skip_action"].sort());
    expect(markers.find((m) => m.type === "skip_action")?.value).toBe(100);
    expect(flags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "flag", flag: "autoFailSave", abilities: ["strength", "dexterity"] }),
        expect.objectContaining({ kind: "flag", flag: "advantageForAttackers" }),
        expect.objectContaining({ kind: "flag", flag: "autoCritAdjacent" }),
      ]),
    );
  });

  it("unconscious implies prone", () => {
    expect(types(expandCondition5e("unconscious", { exhaustion: "2014" }).markers)).toContain("prone");
  });

  it("every condition has a label and description key in the catalog", () => {
    for (const key of Object.keys(CONDITION_5E_REGISTRY)) {
      expect(textOf(dynamicTextRef(`battleCommon.conditions.${key}.label`))).not.toContain("battleCommon.");
    }
  });

  it("conditionEffectInput stores a neutral name and a translatable label", () => {
    const input = conditionEffectInput("deafened", { timedKey: "k", rounds: 1, exhaustion: "2014" });

    expect(input.name).toBe("deafened");
    expect(input.label).toEqual({ message: "battleCommon.conditions.deafened.label" });
    expect(textOf(input.label as TextRef)).toBe("Оглухлий");
  });

  it("deafened is a bare marker", () => {
    expect(expandCondition5e("deafened", { exhaustion: "2014" })).toEqual({ markers: [{ type: "deafened", value: 1 }], flags: [] });
  });

  it("grappled: 2024 adds disadvantage, 2014 does not", () => {
    expect(expandCondition5e("grappled", { exhaustion: "2014" }).flags).toEqual([]);
    expect(expandCondition5e("grappled", { exhaustion: "2024" }).flags).toEqual([expect.objectContaining({ flag: "disadvantage" })]);
  });

  it("exhaustion 2014 table", () => {
    expect(exhaustionEffects(1, "2014")).toEqual([]);
    expect(exhaustionEffects(2, "2014")).toEqual([expect.objectContaining({ kind: "modifyStat", stat: "speed", percent: -50 })]);
    expect(exhaustionEffects(3, "2014").map((e) => ("flag" in e ? e.flag : e.kind))).toEqual(expect.arrayContaining(["disadvantage", "saveDisadvantage"]));
    expect(exhaustionEffects(5, "2014")).toEqual(expect.arrayContaining([expect.objectContaining({ stat: "speed", percent: -100 })]));
  });

  it("exhaustion 2024: -2 per level to attacks and saves, -5 ft speed per level", () => {
    expect(exhaustionEffects(3, "2024")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stat: "attackBonus", flat: -6 }),
        expect.objectContaining({ stat: "savingThrow", flat: -6 }),
        expect.objectContaining({ stat: "speed", flat: -15 }),
      ]),
    );
  });
});
