import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { expandSpellTargets, spellTargetingFor, validateSpellTargetCount } from "@/lib/utils/battle/spell/spell-targeting";
import type { BattleParticipant } from "@/types/battle";

const spell = { id: "bless", groupId: "light", level: 2 };

const caster = (effects: Effect[] = []) =>
  makeParticipant({ id: "c", abilities: effects.length ? [resolved({ trigger: { event: "passive" }, effects })] : [] });

const ally = (id: string) => makeParticipant({ id });

const enemy = (id: string) => makeParticipant({ id, side: ParticipantSide.ENEMY });

const downedAlly = (id: string): BattleParticipant => {
  const p = ally(id);

  return { ...p, combatStats: { ...p.combatStats, status: "dead" } } as BattleParticipant;
};

describe("spell targeting", () => {
  it("no flag → single", () => {
    expect(spellTargetingFor([caster()], "c", spell)).toEqual({ mode: "single", maxTargets: 1 });
  });

  it("school area flag → area 3", () => {
    const c = caster([{ kind: "flag", flag: "spellTargeting", mode: "area", school: "light" }]);

    expect(spellTargetingFor([c], "c", spell)).toEqual({ mode: "area", maxTargets: 3 });
  });

  it("flag for another school is ignored", () => {
    const c = caster([{ kind: "flag", flag: "spellTargeting", mode: "area", school: "chaos" }]);

    expect(spellTargetingFor([c], "c", spell).mode).toBe("single");
  });

  it("all beats area; maxLevel excludes level 5", () => {
    const c = caster([
      { kind: "flag", flag: "spellTargeting", mode: "area", school: "light" },
      { kind: "flag", flag: "spellTargeting", mode: "all", school: "light", maxLevel: 4 },
    ]);

    expect(spellTargetingFor([c], "c", spell).mode).toBe("all");
    expect(spellTargetingFor([c], "c", { ...spell, level: 5 }).mode).toBe("area");
  });

  it("all expands to active units on the first target's side", () => {
    const c = caster([{ kind: "flag", flag: "spellTargeting", mode: "all" }]);

    const ps = [c, ally("a1"), ally("a2"), downedAlly("a3"), enemy("e1")];

    expect(expandSpellTargets(ps, "c", spell, ["a1"]).sort()).toEqual(["a1", "a2", "c"]);
  });

  it("rejects more targets than the skill allows", () => {
    expect(validateSpellTargetCount({ mode: "area", maxTargets: 3 }, 4)).toBe(false);
    expect(validateSpellTargetCount({ mode: "single", maxTargets: 1 }, 2)).toBe(false);
    expect(validateSpellTargetCount({ mode: "all", maxTargets: Infinity }, 5)).toBe(true);
  });

  it("all лишає обрану ціль, навіть якщо вона впала", () => {
    const c = caster([{ kind: "flag", flag: "spellTargeting", mode: "all" }]);

    const ps = [c, ally("a1"), downedAlly("a3")];

    expect(expandSpellTargets(ps, "c", spell, ["a3"]).sort()).toEqual(["a1", "a3", "c"]);
  });
});
