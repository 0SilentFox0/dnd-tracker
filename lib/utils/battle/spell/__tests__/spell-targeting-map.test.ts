import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { resolveSpellTargets, type SpellMapContext } from "@/lib/utils/battle/spell/spell-targeting";
import type { SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 20, rows: 20, background: null, opacity: 0.3 };

const spell = { id: "sp", groupId: "chaos", level: 1 };

function at(id: string, position: GridPoint | undefined, side: ParticipantSide = ParticipantSide.ALLY, effects: Effect[] = []): BattleParticipant {
  const p = makeParticipant({ id, side, abilities: effects.length ? [resolved({ trigger: { event: "passive" }, effects })] : [] });

  return { ...p, battleData: { ...p.battleData, position } };
}

const caster = at("c", { x: 2, y: 2 });

const ally = at("a", { x: 5, y: 2 });

const e1 = at("e1", { x: 7, y: 2 }, ParticipantSide.ENEMY);

const e2 = at("e2", { x: 6, y: 3 }, ParticipantSide.ENEMY);

const far = at("far", { x: 18, y: 18 }, ParticipantSide.ENEMY);

const ps = [caster, ally, e1, e2, far];

const fireball: SpellTargeting = { kind: "template", shape: "circle", size: 10, side: "enemy", maxTargets: 3, range: 30 };

const resolve = (targeting: SpellTargeting, chosen: string[], ctx?: SpellMapContext, list = ps, who = caster) => resolveSpellTargets(list, who, spell, targeting, chosen, ctx);

describe("resolveSpellTargets на карті", () => {
  it("коло зачіпає союзника й ворогів, обраних ігнорує, порядок — від точки", () => {
    const r = resolve(fireball, ["far"], { map, targetCell: { x: 6, y: 3 } });

    expect(r.ok).toBe(true);
    expect(r.ok && r.targetIds).toEqual(["e2", "a", "e1"]);
    expect(r.ok && r.cells).toContain("6:2");
  });

  it("коло біля заклинателя зачіпає й заклинателя", () => {
    expect(resolve(fireball, [], { map, targetCell: { x: 3, y: 2 } })).toMatchObject({ ok: true, targetIds: ["c"] });

    const quake: SpellTargeting = { ...fireball, size: 20 };

    expect(resolve(quake, [], { map, targetCell: { x: 3, y: 2 } })).toMatchObject({ ok: true, targetIds: ["c", "a"] });
  });

  it("кільце: учасник у центральній клітинці не ціль, сусіди — цілі", () => {
    const ring: SpellTargeting = { ...fireball, hollow: true };

    const r = resolve(ring, [], { map, targetCell: { x: 6, y: 3 } });

    expect(r.ok && r.targetIds).toEqual(["a", "e1"]);
    expect(r.ok && r.cells).not.toContain("6:3");
    expect(r.ok && r.centre).toEqual({ x: 6, y: 3 });
  });

  it("лінія: falloff іде за відстанню від вершини", () => {
    const line: SpellTargeting = { kind: "template", shape: "line", size: 60, side: "enemy", maxTargets: 3 };

    const r = resolve(line, [], { map, targetCell: { x: 10, y: 2 } });

    expect(r.ok && r.targetIds).toEqual(["a", "e1"]);
  });

  it("без точки — відмова", () => {
    expect(resolve(fireball, [], { map })).toEqual({ ok: false, error: "Оберіть точку на карті" });
  });

  it("точка поза дальністю — відмова", () => {
    expect(resolve(fireball, [], { map, targetCell: { x: 15, y: 2 } })).toEqual({ ok: false, error: "Точка поза дальністю заклинання" });
  });

  it("порожній шаблон — каст у порожнечу з aimCell; із zone теж", () => {
    expect(resolve(fireball, [], { map, targetCell: { x: 2, y: 8 } })).toMatchObject({ ok: true, targetIds: [], centre: { x: 2, y: 8 } });

    const wall: SpellTargeting = { kind: "template", shape: "line", size: 30, side: "enemy", maxTargets: 6, zone: { rounds: 2 } };

    const r = resolve(wall, [], { map, targetCell: { x: 2, y: 10 } });

    expect(r.ok && r.targetIds).toEqual([]);
    expect(r.ok && r.cells?.length).toBe(6);
  });

  it("конус чи лінія в клітинку заклинателя не мають клітинок — відмова «Оберіть напрямок»", () => {
    const wall: SpellTargeting = { kind: "template", shape: "line", size: 30, side: "enemy", maxTargets: 6, zone: { rounds: 2 } };

    const cone: SpellTargeting = { kind: "template", shape: "cone", size: 15, side: "enemy", maxTargets: 6 };

    expect(resolve(wall, [], { map, targetCell: { x: 2, y: 2 } })).toEqual({ ok: false, error: "Оберіть напрямок" });
    expect(resolve(cone, [], { map, targetCell: { x: 2, y: 2 } })).toEqual({ ok: false, error: "Оберіть напрямок" });
  });

  it("без карти або без позиції заклинателя шаблон — ручний вибір як area", () => {
    expect(resolve(fireball, ["e1", "e2"])).toEqual({ ok: true, targetIds: ["e1", "e2"] });
    expect(resolve(fireball, ["e1", "e2"], { map: null, targetCell: { x: 6, y: 2 } })).toEqual({ ok: true, targetIds: ["e1", "e2"] });

    const unplaced = at("c", undefined);

    expect(resolve(fireball, ["e1"], { map, targetCell: { x: 6, y: 2 } }, [unplaced, ally, e1], unplaced)).toEqual({ ok: true, targetIds: ["e1"] });
    expect(resolve(fireball, ["a"]).ok).toBe(false);
  });

  it("одиночна ціль поза range — відмова, у межах — ок, без range — ок", () => {
    const bolt: SpellTargeting = { kind: "enemy", range: 20 };

    expect(resolve(bolt, ["far"], { map })).toEqual({ ok: false, error: "Ціль поза дальністю заклинання" });
    expect(resolve(bolt, ["e2"], { map })).toEqual({ ok: true, targetIds: ["e2"] });
    expect(resolve({ kind: "enemy" }, ["far"], { map })).toEqual({ ok: true, targetIds: ["far"] });
    expect(resolve(bolt, ["far"])).toEqual({ ok: true, targetIds: ["far"] });
  });

  it("area з range перевіряє кожну обрану ціль; ціль без позиції не перевіряється", () => {
    const area: SpellTargeting = { kind: "area", side: "enemy", maxTargets: 3, range: 30 };

    expect(resolve(area, ["e1", "far"], { map }).ok).toBe(false);

    const unplacedEnemy = at("u", undefined, ParticipantSide.ENEMY);

    expect(resolve(area, ["e1", "u"], { map }, [...ps, unplacedEnemy])).toEqual({ ok: true, targetIds: ["e1", "u"] });
  });
});

describe("заклинання, розширене вмінням, на карті — радіус", () => {
  const widened = (mode: "area" | "all", maxTargets?: number) => at("c", { x: 2, y: 2 }, ParticipantSide.ALLY, [{ kind: "flag", flag: "spellTargeting", mode, ...(maxTargets && { maxTargets }) }]);

  const near = at("n1", { x: 7, y: 3 }, ParticipantSide.ENEMY);

  const mid = at("n2", { x: 6, y: 2 }, ParticipantSide.ENEMY);

  const edge = at("n3", { x: 9, y: 3 }, ParticipantSide.ENEMY);

  const friend = at("a", { x: 6, y: 3 });

  const farFoe = at("far", { x: 18, y: 18 }, ParticipantSide.ENEMY);

  const scene = (c: BattleParticipant) => [c, near, mid, edge, friend, farFoe];

  const bolt: SpellTargeting = { kind: "enemy", range: 30 };

  it("area: коло 10 футів, лише вороги, найближчі до точки, не більше maxTargets; обрані ігноруються", () => {
    const c = widened("area", 2);

    expect(resolve(bolt, ["far"], { map, targetCell: { x: 7, y: 3 } }, scene(c), c)).toMatchObject({ ok: true, targetIds: ["n1", "n2"] });
  });

  it("all: коло 20 футів без ліміту, союзник у колі не зачеплений", () => {
    const c = widened("all");

    const r = resolve(bolt, [], { map, targetCell: { x: 7, y: 3 } }, scene(c), c);

    expect(r).toMatchObject({ ok: true, targetIds: ["n1", "n2", "n3"] });
    expect(r.ok && r.cells).toHaveLength(25);
    expect(r.ok && r.cells).toContain("9:5");
    expect(r.ok && r.cells).not.toContain("7:6");
  });

  it("союзне заклинання зачіпає союзників разом із заклинателем, не ворогів", () => {
    const c = widened("all");

    expect(resolve({ kind: "ally" }, [], { map, targetCell: { x: 4, y: 2 } }, scene(c), c)).toMatchObject({ ok: true, targetIds: ["c", "a"] });
  });

  it("точка поза дальністю, без точки — відмова; порожній радіус — каст у порожнечу", () => {
    const c = widened("area");

    expect(resolve(bolt, ["n1"], { map, targetCell: { x: 12, y: 3 } }, scene(c), c)).toEqual({ ok: false, error: "Точка поза дальністю заклинання" });
    expect(resolve(bolt, ["n1"], { map }, scene(c), c)).toEqual({ ok: false, error: "Оберіть точку на карті" });
    expect(resolve(bolt, [], { map, targetCell: { x: 2, y: 8 } }, scene(c), c)).toMatchObject({ ok: true, targetIds: [], centre: { x: 2, y: 8 } });
  });

  it("без карти чи без позиції заклинателя — ручний вибір як раніше", () => {
    const c = widened("area", 2);

    expect(resolve(bolt, ["n1", "far"], undefined, scene(c), c)).toEqual({ ok: true, targetIds: ["n1", "far"] });

    const unplaced = { ...c, battleData: { ...c.battleData, position: undefined } };

    expect(resolve(bolt, ["n1", "n3"], { map, targetCell: { x: 7, y: 3 } }, scene(unplaced), unplaced)).toEqual({ ok: true, targetIds: ["n1", "n3"] });
  });

  it("без вміння одиночне заклинання на карті лишається вибором цілі", () => {
    expect(resolve(bolt, ["e2"], { map, targetCell: { x: 6, y: 3 } })).toEqual({ ok: true, targetIds: ["e2"] });
  });
});

describe("ланцюг на карті", () => {
  const chain: SpellTargeting = { kind: "area", side: "enemy", maxTargets: 4, range: 30, chain: true };

  const k1 = at("k1", { x: 6, y: 2 }, ParticipantSide.ENEMY);

  const k2 = at("k2", { x: 8, y: 2 }, ParticipantSide.ENEMY);

  const k3 = at("k3", { x: 8, y: 5 }, ParticipantSide.ENEMY);

  const k4 = at("k4", { x: 12, y: 2 }, ParticipantSide.ENEMY);

  const k5 = at("k5", { x: 13, y: 2 }, ParticipantSide.ENEMY);

  const friend = at("a", { x: 6, y: 3 });

  const dead = { ...at("dead", { x: 7, y: 2 }, ParticipantSide.ENEMY), combatStats: { ...k1.combatStats, currentHp: 0, status: "dead" as const } };

  const unplaced = at("u", undefined, ParticipantSide.ENEMY);

  const list = [caster, k5, k4, k3, k2, k1, friend, dead, unplaced];

  it("від першої цілі — до найближчого живого ворога на карті від попередньої, без повторів, до maxTargets", () => {
    expect(resolve(chain, ["k1"], { map }, list)).toEqual({ ok: true, targetIds: ["k1", "k2", "k3", "k4"] });
  });

  it("рівна відстань — за порядком ініціативи; ворогів менше за ліміт — коротший ланцюг", () => {
    const left = at("l", { x: 4, y: 2 }, ParticipantSide.ENEMY);

    const right = at("r", { x: 8, y: 2 }, ParticipantSide.ENEMY);

    const mid = at("m", { x: 6, y: 2 }, ParticipantSide.ENEMY);

    expect(resolve(chain, ["m"], { map }, [caster, right, left, mid])).toEqual({ ok: true, targetIds: ["m", "r", "l"] });
  });

  it("без обмеження довжини стрибка", () => {
    const farFoe = at("far", { x: 19, y: 19 }, ParticipantSide.ENEMY);

    expect(resolve(chain, ["k1"], { map }, [caster, k1, farFoe])).toEqual({ ok: true, targetIds: ["k1", "far"] });
  });

  it("на карті рівно одна перша ціль у межах дальності", () => {
    expect(resolve(chain, ["k1", "k2"], { map }, list)).toEqual({ ok: false, error: "Оберіть одну першу ціль ланцюга" });
    expect(resolve(chain, ["k5"], { map }, list)).toEqual({ ok: false, error: "Ціль поза дальністю заклинання" });
    expect(resolve(chain, ["a"], { map }, list).ok).toBe(false);
  });

  it("без карти чи без позиції заклинателя — ручний вибір у порядку вибору", () => {
    expect(resolve(chain, ["k3", "k1"], undefined, list)).toEqual({ ok: true, targetIds: ["k3", "k1"] });

    const off = at("c", undefined);

    expect(resolve(chain, ["k3", "k1"], { map }, [off, ...list.slice(1)], off)).toEqual({ ok: true, targetIds: ["k3", "k1"] });
  });
});
