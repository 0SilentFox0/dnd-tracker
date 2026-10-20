import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/core/targets";
import type { Effect } from "@/lib/utils/abilities/schema";
import { spellTargetInRange } from "@/lib/utils/battle/flows/spell-flow";
import { mazeMap } from "@/lib/utils/battle/maze/__tests__/fixtures";
import { resolveSpellTargets, type SpellMapContext } from "@/lib/utils/battle/spell/spell-targeting";
import type { SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleMapConfig, BattleParticipant, Direction8, GridPoint, MazeConfig } from "@/types/battle";

const mapOf = (over: Partial<MazeConfig> = {}): BattleMapConfig => mazeMap({ exit: { x: 11, y: 11 }, ...over }, 12);

const spell = { id: "sp", groupId: "chaos", level: 1 };

function at(id: string, position: GridPoint, side: ParticipantSide = ParticipantSide.ALLY, extra: { facing?: Direction8; effects?: Effect[]; dormant?: boolean } = {}): BattleParticipant {
  const p = makeParticipant({ id, side, abilities: extra.effects?.length ? [resolved({ trigger: { event: "passive" }, effects: extra.effects })] : [] });

  return { ...p, battleData: { ...p.battleData, position, ...(extra.facing && { facing: extra.facing }), ...(extra.dormant && { dormant: true }) } };
}

const caster = at("c", { x: 5, y: 5 }, ParticipantSide.ALLY, { facing: "e" });

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
    const wide = at("c", { x: 5, y: 5 }, ParticipantSide.ALLY, { facing: "e", effects: [{ kind: "flag", flag: "spellTargeting", mode: "area", maxTargets: 3 }] });

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

const friendBehind = at("a2", { x: 3, y: 9 });

const massPs = [caster, ahead, behind, friendBehind];

const resolveMass = (targeting: SpellTargeting, ctx: SpellMapContext) => resolveSpellTargets(massPs, caster, spell, targeting, [], ctx);

describe("масові заклинання в лабіринті — лише вороги в полі зору заклинателя", () => {
  it("«усі вороги»: ворог позаду не зачеплений; без лабіринту — усі", () => {
    expect(resolveMass({ kind: "allEnemies" }, { map: mapOf() })).toEqual({ ok: true, targetIds: ["e1"] });
    expect(resolveMass({ kind: "allEnemies" }, { map: { ...mapOf(), maze: null } })).toEqual({ ok: true, targetIds: ["e1", "e2"] });
  });

  it("«усі»: союзники поза полем зору лишаються, невидимі вороги — ні", () => {
    expect(resolveMass({ kind: "everyone" }, { map: mapOf() })).toEqual({ ok: true, targetIds: ["c", "e1", "a2"] });
    expect(resolveMass({ kind: "allAllies" }, { map: mapOf() })).toEqual({ ok: true, targetIds: ["c", "a2"] });
  });

  it("розширення вмінням «на всіх»: лише видимі вороги", () => {
    const widened = at("c", { x: 5, y: 5 }, ParticipantSide.ALLY, { facing: "e", effects: [{ kind: "flag", flag: "spellTargeting", mode: "all" } as Effect] });

    const r = resolveSpellTargets([widened, ahead, behind], widened, spell, { kind: "enemy", range: 120 }, ["e1"], { map: mapOf() });

    expect(r).toEqual({ ok: true, targetIds: ["e1"] });
  });
});

describe("масові вміння не зачіпають сплячих у лабіринті", () => {
  it("allEnemies / everyone без сплячого", () => {
    const sleeper = at("z", { x: 9, y: 9 }, ParticipantSide.ENEMY, { dormant: true });

    const list = [caster, ahead, sleeper];

    const event = { type: "turnStart", participantId: "c" } as unknown as AbilityEvent;

    expect(resolveTargetIds("allEnemies", "c", event, list)).toEqual(["e1"]);
    expect(resolveTargetIds("everyone", "c", event, list)).toEqual(["c", "e1"]);
  });
});
