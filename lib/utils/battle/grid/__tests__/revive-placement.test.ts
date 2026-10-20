import { describe, expect, it } from "vitest";

import { canStand, isOnMap, occupiedBy } from "../occupancy";
import { reachable } from "../path";
import { placeRevived } from "../revive-placement";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeEffect } from "@/lib/utils/abilities/__tests__/fixtures";
import { byId, placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { clearFallenEffects } from "@/lib/utils/battle/participant/fallen";
import { displayEffects } from "@/lib/utils/battle/view/personal-effects";
import type { BattleParticipant } from "@/types/battle";

const fall = (p: BattleParticipant, status: BattleParticipant["combatStats"]["status"] = CombatStatus.DEAD): BattleParticipant => ({
  ...p,
  combatStats: { ...p.combatStats, status, currentHp: 0 },
});

const revive = (p: BattleParticipant): BattleParticipant => ({ ...p, combatStats: { ...p.combatStats, status: CombatStatus.ACTIVE, currentHp: 5 } });

const at = (id: string, x: number, y: number, size?: number, side = ParticipantSide.ALLY) => placed(id, { at: { x, y }, size, side });

const withEffects = (p: BattleParticipant, ids: string[]): BattleParticipant => ({ ...p, battleData: { ...p.battleData, activeEffects: ids.map((id) => makeEffect(id)) } });

describe("полеглий на карті", () => {
  it("мертвий і непритомний не займають клітинок і не рахуються на карті", () => {
    const dead = fall(at("d", 2, 2));

    const down = fall(at("u", 3, 3), CombatStatus.UNCONSCIOUS);

    expect(isOnMap(dead)).toBe(false);
    expect(isOnMap(down)).toBe(false);
    expect(occupiedBy([dead, down], () => true).size).toBe(0);
  });

  it("клітинку мертвого можна обійти й стати на неї", () => {
    const mover = at("m", 0, 0);

    const dead = fall(at("d", 1, 0, undefined, ParticipantSide.ENEMY));

    const map = testMap(4, 1);

    expect(canStand(map, [mover, dead], mover, { x: 1, y: 0 })).toBe(true);
    expect(reachable(map, [mover, dead], mover, 3).has("2:0")).toBe(true);
  });

  it("при смерті баффи й дебаффи зникають, живі не чіпаються", () => {
    const dying = fall(withEffects(at("d", 1, 1), ["buff", "dot"]));

    const alive = withEffects(at("a", 2, 2), ["buff"]);

    const out = clearFallenEffects([dying, alive]);

    expect(out[0].battleData.activeEffects).toEqual([]);
    expect(out[1]).toBe(alive);
    expect(clearFallenEffects(out)).toBe(out);
  });

  it("ефекти полеглого не показуються", () => {
    const dead = fall(withEffects(at("d", 1, 1), ["buff"]));

    expect(displayEffects(dead, [dead])).toEqual([]);
  });
});

describe("воскресіння на карті", () => {
  const map = testMap(6, 6);

  it("повертається на свою останню клітинку, якщо вона вільна", () => {
    const dead = fall(at("d", 2, 2));

    const other = at("o", 4, 4);

    const out = placeRevived(map, [dead, other], [revive(dead), other]);

    expect(byId(out, "d").battleData.position).toEqual({ x: 2, y: 2 });
  });

  it("клітинка зайнята — найближча вільна, перший збіг зверху вниз", () => {
    const dead = fall(at("d", 2, 2));

    const squatter = at("s", 2, 2, undefined, ParticipantSide.ENEMY);

    const out = placeRevived(map, [dead, squatter], [revive(dead), squatter]);

    expect(byId(out, "d").battleData.position).toEqual({ x: 1, y: 1 });
    expect(byId(out, "s").battleData.position).toEqual({ x: 2, y: 2 });
  });

  it("обходить інші зайняті клітинки й бар'єри", () => {
    const dead = fall(at("d", 2, 2));

    const ring = [at("s", 2, 2), at("a", 1, 1), at("b", 2, 1), at("c", 3, 1)];

    const blocked = testMap(6, 6, { blocked: ["1:2"] });

    const out = placeRevived(blocked, [dead, ...ring], [revive(dead), ...ring]);

    expect(byId(out, "d").battleData.position).toEqual({ x: 3, y: 2 });
  });

  it("два воскреслих разом не стають на одну клітинку", () => {
    const d1 = fall(at("d1", 2, 2));

    const d2 = fall(at("d2", 2, 2));

    const out = placeRevived(map, [d1, d2], [revive(d1), revive(d2)]);

    expect(byId(out, "d1").battleData.position).toEqual({ x: 2, y: 2 });
    expect(byId(out, "d2").battleData.position).not.toEqual({ x: 2, y: 2 });
  });

  it("велика істота 2×2 шукає вільний квадрат", () => {
    const dead = fall(at("big", 2, 2, 2));

    const squatter = at("s", 3, 3, undefined, ParticipantSide.ENEMY);

    const out = placeRevived(map, [dead, squatter], [revive(dead), squatter]);

    const pos = byId(out, "big").battleData.position as { x: number; y: number };

    expect(canStand(map, out, byId(out, "big"), pos)).toBe(true);
    expect(pos).not.toEqual({ x: 2, y: 2 });
  });

  it("на тісній карті великого не вміщує — позиція скидається", () => {
    const tiny = testMap(2, 2);

    const dead = fall(at("big", 0, 0, 2));

    const squatter = at("s", 1, 1, undefined, ParticipantSide.ENEMY);

    const out = placeRevived(tiny, [dead, squatter], [revive(dead), squatter]);

    expect(byId(out, "big").battleData.position).toBeUndefined();
  });

  it("не чіпає тих, хто не був полеглим", () => {
    const a = at("a", 2, 2);

    expect(placeRevived(map, [a], [a])).toEqual([a]);
  });

  it("у лабіринті шукає за кроками, а не крізь стіну", () => {
    const grid = mazeMap({ walls: ["1:2:e", "2:1:s", "2:2:e"] }, 6);

    const dead = fall(at("d", 2, 2));

    const squatter = at("s", 2, 2, undefined, ParticipantSide.ENEMY);

    const out = placeRevived(grid, [dead, squatter], [revive(dead), squatter]);

    const pos = byId(out, "d").battleData.position as { x: number; y: number };

    expect(pos).not.toEqual({ x: 2, y: 2 });
    expect(pos).toEqual({ x: 2, y: 3 });
  });

  it("у лабіринті вихід не займається", () => {
    const grid = mazeMap({ exit: { x: 1, y: 2 } }, 6);

    const dead = fall(at("d", 2, 2));

    const squatter = at("s", 2, 2, undefined, ParticipantSide.ENEMY);

    const out = placeRevived(grid, [dead, squatter], [revive(dead), squatter]);

    expect(byId(out, "d").battleData.position).not.toEqual({ x: 1, y: 2 });
  });
});
