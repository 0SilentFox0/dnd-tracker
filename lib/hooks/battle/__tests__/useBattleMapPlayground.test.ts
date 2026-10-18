// @vitest-environment happy-dom
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBattleMapPlayground } from "../useBattleMapPlayground";

import { GridShape } from "@/lib/constants/battle";
import { occupiedBy } from "@/lib/utils/battle/grid";

type Hook = { current: ReturnType<typeof useBattleMapPlayground> };

function active(result: Hook) {
  return result.current.participants.find((p) => p.basicInfo.id === result.current.activeId)!;
}

function parse(key: string) {
  const [x, y] = key.split(":").map(Number);

  return { x, y };
}

describe("useBattleMapPlayground", () => {
  it("places every mock participant at start", () => {
    const { result } = renderHook(() => useBattleMapPlayground());

    expect(result.current.participants).toHaveLength(8);
    expect(result.current.participants.every((p) => p.battleData.position)).toBe(true);
    expect(result.current.mode).toBe("move");
  });

  it("moves the active participant to a reachable cell and spends movement", () => {
    const { result } = renderHook(() => useBattleMapPlayground());

    const before = active(result).battleData.position;

    const [key, cost] = [...result.current.view.marks!.entries()].find(([, v]) => typeof v === "number" && v > 0)! as [string, number];

    act(() => result.current.actions.onCellClick(parse(key)));

    expect(active(result).battleData.position).toEqual(parse(key));
    expect(active(result).battleData.position).not.toEqual(before);
    expect(active(result).battleData.movementUsed).toBe(cost);
  });

  it("ignores clicks on unreachable cells", () => {
    const { result } = renderHook(() => useBattleMapPlayground());

    const before = active(result).battleData.position;

    act(() => result.current.actions.onCellClick({ x: 19, y: 0 }));

    expect(active(result).battleData.position).toEqual(before);
    expect(active(result).battleData.movementUsed ?? 0).toBe(0);
  });

  it("nextTurn resets movement and changes the active participant", () => {
    const { result } = renderHook(() => useBattleMapPlayground());

    const first = result.current.activeId;

    act(() => result.current.controls.nextTurn());

    expect(result.current.activeId).not.toBe(first);
    expect(active(result).battleData.movementUsed ?? 0).toBe(0);
  });

  it("re-places everyone without overlaps when the grid becomes hex", () => {
    const { result } = renderHook(() => useBattleMapPlayground());

    act(() => result.current.setMap({ ...result.current.map, grid: GridShape.HEX }));

    const { participants, map } = result.current;

    expect(map.grid).toBe(GridShape.HEX);
    expect(participants.every((p) => p.battleData.position)).toBe(true);

    const cells = participants.flatMap((p) => [...occupiedBy(map.grid, [p], () => true)]);

    expect(new Set(cells).size).toBe(cells.length);
  });

  it("attack mode damages the target under the clicked cell and logs it", () => {
    const { result } = renderHook(() => useBattleMapPlayground());

    act(() => result.current.controls.nextTurn());
    act(() => result.current.setMap({ ...result.current.map, cols: 10, rows: 6 }));
    act(() => result.current.controls.setMode("attack"));

    const key = [...result.current.view.marks!.entries()].find(([, v]) => v === "target")![0];

    const targetId = result.current.participants.find((p) => p.basicInfo.side === "enemy" && occupiedBy("square", [p], () => true).has(key))!.basicInfo.id;

    const hpBefore = result.current.participants.find((p) => p.basicInfo.id === targetId)!.combatStats.currentHp;

    act(() => result.current.actions.onCellClick(parse(key)));

    expect(result.current.participants.find((p) => p.basicInfo.id === targetId)!.combatStats.currentHp).toBe(hpBefore - 7);
    expect(result.current.log[0]).toContain("-7");
  });
});
