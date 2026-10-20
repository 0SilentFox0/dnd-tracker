import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { spellTargetInRange } from "@/lib/utils/battle/flows/spell-flow";
import { resolveSpellTargets, type SpellMapContext } from "@/lib/utils/battle/spell/spell-targeting";
import type { SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { BattleMapConfig, BattleParticipant, Direction8, GridPoint, MazeConfig } from "@/types/battle";

const mapOf = (over: Partial<MazeConfig> = {}): BattleMapConfig => ({
  cols: 12,
  rows: 12,
  background: null,
  opacity: 0.3,
  maze: { walls: [], exit: { x: 11, y: 11 }, difficulty: "medium", teleports: [], fog: [], marks: {}, dark: false, ...over },
});

const spell = { id: "sp", groupId: "chaos", level: 1 };

function at(id: string, position: GridPoint, side: ParticipantSide = ParticipantSide.ALLY, facing?: Direction8, effects: Effect[] = []): BattleParticipant {
  const p = makeParticipant({ id, side, abilities: effects.length ? [resolved({ trigger: { event: "passive" }, effects })] : [] });

  return { ...p, battleData: { ...p.battleData, position, ...(facing && { facing }) } };
}

const caster = at("c", { x: 5, y: 5 }, ParticipantSide.ALLY, "e");

const ahead = at("e1", { x: 8, y: 5 }, ParticipantSide.ENEMY);

const behind = at("e2", { x: 2, y: 5 }, ParticipantSide.ENEMY);

const ps = [caster, ahead, behind];

const bolt: SpellTargeting = { kind: "enemy", range: 120 };

const fireball: SpellTargeting = { kind: "template", shape: "circle", size: 10, side: "enemy", maxTargets: 5, range: 120 };

const resolve = (targeting: SpellTargeting, chosen: string[], ctx: SpellMapContext, list = ps, who = caster) => resolveSpellTargets(list, who, spell, targeting, chosen, ctx);

describe("заклинання в лабіринті", () => {
  it("одиночна ціль: у полі зору — ок, позаду чи за стіною — відмова", () => {
    expect(resolve(bolt, ["e1"], { map: mapOf() })).toEqual({ ok: true, targetIds: ["e1"] });
    expect(resolve(bolt, ["e2"], { map: mapOf() })).toEqual({ ok: false, error: "Ціль поза полем зору" });
    expect(resolve(bolt, ["e1"], { map: mapOf({ walls: ["6:5:e"] }) })).toEqual({ ok: false, error: "Ціль поза полем зору" });
  });

  it("на себе й без лабіринту — як раніше", () => {
    expect(resolve({ kind: "ally", range: 30 }, ["c"], { map: mapOf() })).toEqual({ ok: true, targetIds: ["c"] });

    const plain = { cols: 12, rows: 12, background: null, opacity: 0.3 };

    expect(resolve(bolt, ["e2"], { map: plain })).toEqual({ ok: true, targetIds: ["e2"] });
  });

  it("шаблон: приціл поза полем зору — відмова; у полі зору — зона не зупиняється тонкими стінами", () => {
    expect(resolve(fireball, [], { map: mapOf(), targetCell: { x: 2, y: 5 } })).toEqual({ ok: false, error: "Точка поза полем зору" });

    const r = resolve(fireball, [], { map: mapOf({ walls: ["8:5:e"] }), targetCell: { x: 8, y: 5 } });

    expect(r.ok).toBe(true);
    expect(r.ok && r.cells).toContain("9:5");
  });

  it("розширення вмінням (радіус): приціл поза полем зору — відмова", () => {
    const wide = at("c", { x: 5, y: 5 }, ParticipantSide.ALLY, "e", [{ kind: "flag", flag: "spellTargeting", mode: "area", maxTargets: 3 }]);

    expect(resolve(bolt, [], { map: mapOf(), targetCell: { x: 2, y: 5 } }, [wide, ahead, behind], wide)).toEqual({ ok: false, error: "Точка поза полем зору" });
    expect(resolve(bolt, [], { map: mapOf(), targetCell: { x: 8, y: 5 } }, [wide, ahead, behind], wide)).toMatchObject({ ok: true, targetIds: ["e1"] });
  });

  it("ланцюг: перша ціль — у полі зору, стрибки стіни не перевіряють", () => {
    const chain: SpellTargeting = { kind: "area", side: "enemy", maxTargets: 2, range: 120, chain: true };

    const next = at("e3", { x: 9, y: 5 }, ParticipantSide.ENEMY);

    const map = mapOf({ walls: ["8:5:e"] });

    expect(resolve(chain, ["e1"], { map }, [caster, ahead, next])).toEqual({ ok: true, targetIds: ["e1", "e3"] });
    expect(resolve(chain, ["e2"], { map }, [caster, behind, next])).toEqual({ ok: false, error: "Ціль поза полем зору" });
  });
});

describe("spellTargetInRange у лабіринті", () => {
  it("підсвічує лише ціль у полі зору", () => {
    expect(spellTargetInRange(mapOf(), caster, ahead, 120)).toBe(true);
    expect(spellTargetInRange(mapOf(), caster, behind, 120)).toBe(false);
  });
});

describe("ціль без дальності", () => {
  it("теж лише в полі зору", () => {
    expect(resolve({ kind: "enemy" }, ["e2"], { map: mapOf() })).toEqual({ ok: false, error: "Ціль поза полем зору" });
    expect(spellTargetInRange(mapOf(), caster, behind, undefined)).toBe(false);
  });
});
