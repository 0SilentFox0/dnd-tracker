import { describe, expect, it } from "vitest";

import { lineOfFire } from "../line-of-fire";

import { ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import type { BattleParticipant, GridPoint } from "@/types/battle";

const MAP = testMap();

const at = (id: string, pos: GridPoint, side: ParticipantSide = ParticipantSide.ENEMY, size?: number) => placed(id, { side, at: pos, hp: 20, size });

const shooter = at("s", { x: 0, y: 5 }, ParticipantSide.ALLY);

const target = at("t", { x: 6, y: 5 });

const down = (p: BattleParticipant) => ({ ...p, combatStats: { ...p.combatStats, currentHp: 0 } });

describe("lineOfFire", () => {
  it("вільна лінія — без перешкоди", () => {
    expect(lineOfFire(MAP, [shooter, target], shooter, target)).toEqual({ blocked: false, cells: [] });
  });

  it("союзник і ворог на лінії заважають", () => {
    expect(lineOfFire(MAP, [shooter, target, at("ally", { x: 2, y: 5 }, ParticipantSide.ALLY)], shooter, target)).toEqual({ blocked: true, cells: ["2:5"] });
    expect(lineOfFire(MAP, [shooter, target, at("foe", { x: 4, y: 5 })], shooter, target).cells).toEqual(["4:5"]);
  });

  it("стіна, барʼєр і неігрова клітинка заважають, небезпека — ні", () => {
    const terrain = { "1:5": { kind: "wall" as const }, "3:5": { kind: "barrier" as const }, "4:5": { kind: "hazard" as const } };

    expect(lineOfFire({ ...MAP, terrain, blocked: ["5:5"] }, [shooter, target], shooter, target).cells).toEqual(["1:5", "3:5", "5:5"]);
  });

  it("повалений і той, хто в повітрі, не заважають", () => {
    const flying = at("fly", { x: 3, y: 5 });

    const airborne = { ...flying, battleData: { ...flying.battleData, airborne: { since: 1, percent: 200, name: "Пікірування" } } };

    expect(lineOfFire(MAP, [shooter, target, down(at("d", { x: 2, y: 5 })), airborne], shooter, target).blocked).toBe(false);
  });

  it("сусідні клітинки (і діагональ) — без перешкоди", () => {
    expect(lineOfFire(MAP, [shooter, at("n", { x: 1, y: 6 })], shooter, at("n", { x: 1, y: 6 })).blocked).toBe(false);
  });

  it("велика ціль: лінія до її найближчої клітинки, власний footprint не заважає", () => {
    const big = at("big", { x: 5, y: 4 }, ParticipantSide.ENEMY, 2);

    expect(lineOfFire(MAP, [shooter, big], shooter, big)).toEqual({ blocked: false, cells: [] });
  });

  it("великий стрілець не заважає сам собі", () => {
    const bigShooter = at("bs", { x: 0, y: 4 }, ParticipantSide.ALLY, 2);

    expect(lineOfFire(MAP, [bigShooter, target], bigShooter, target).blocked).toBe(false);
  });

  it("без карти або без позиції — без перешкоди", () => {
    expect(lineOfFire(null, [shooter, target], shooter, target).blocked).toBe(false);
    expect(lineOfFire(MAP, [shooter, placed("off")], shooter, placed("off")).blocked).toBe(false);
  });

  it("лабіринт: тонка стіна між клітинками лінії — перешкода", () => {
    const map = mazeMap({ walls: ["2:5:e"] }, 10);

    expect(lineOfFire(map, [shooter, target], shooter, target)).toEqual({ blocked: true, cells: [] });
  });
});
