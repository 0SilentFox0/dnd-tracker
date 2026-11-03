// @vitest-environment happy-dom
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBattleMapPlayground } from "../useBattleMapPlayground";

import { DEFAULT_BATTLE_MAP, MAZE_MARK_SYMBOLS } from "@/lib/constants/battle";
import { buildMockParticipants } from "@/lib/hooks/battle/mock-participants";
import { occupiedBy, placeParticipants } from "@/lib/utils/battle/grid";
import type { BattleMapConfig } from "@/types/battle";

type Hook = { current: ReturnType<typeof useBattleMapPlayground> };

function active(result: Hook) {
  return result.current.participants.find((p) => p.basicInfo.id === result.current.activeId)!;
}

function parse(key: string) {
  const [x, y] = key.split(":").map(Number);

  return { x, y };
}

describe("useBattleMapPlayground", () => {
  it("starts from a prepared map and participants and resets local changes to that snapshot", () => {
    const map: BattleMapConfig = { ...DEFAULT_BATTLE_MAP, cols: 12, rows: 8, maze: { walls: [], exit: null, difficulty: "easy", teleports: [], fog: [], marks: {}, dark: false } };

    const participants = placeParticipants(map, buildMockParticipants().slice(0, 2));

    participants[0].combatStats.currentHp = 12;

    const { result } = renderHook(() => useBattleMapPlayground({ map, participants }));

    expect(result.current.map).toMatchObject({ cols: 12, rows: 8, maze: { difficulty: "easy" } });
    expect(result.current.participants).toEqual(participants);

    act(() => result.current.controls.setMode("attack"));
    act(() => result.current.controls.nextTurn());
    act(() => result.current.controls.reset());

    expect(result.current.activeId).toBe(participants[0].basicInfo.id);
    expect(result.current.participants).toEqual(participants);
    expect(result.current.mode).toBe("move");
    expect(result.current.log).toEqual([]);
  });

  it("places maze marks in client state without a server action", () => {
    const map: BattleMapConfig = { ...DEFAULT_BATTLE_MAP, maze: { walls: [], exit: null, difficulty: "easy", teleports: [], fog: [], marks: {}, dark: false } };

    const participants = placeParticipants(map, buildMockParticipants().slice(0, 2));

    const { result } = renderHook(() => useBattleMapPlayground({ map, participants }));

    act(() => result.current.controls.setMode("maze-mark"));
    act(() => result.current.actions.onCellClick({ x: 1, y: 1 }));

    expect(result.current.map.maze?.marks["1:1"]).toMatchObject({ symbol: MAZE_MARK_SYMBOLS[0], by: result.current.activeId });
    expect(result.current.log[0]).toMatchObject({ key: "mazeMark", params: { cell: "1:1" } });
  });

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

  it("re-places everyone without overlaps when the map size changes", () => {
    const { result } = renderHook(() => useBattleMapPlayground());

    act(() => result.current.setMap({ ...result.current.map, cols: 12 }));

    const { participants, map } = result.current;

    expect(map.cols).toBe(12);
    expect(participants.every((p) => p.battleData.position)).toBe(true);

    const cells = participants.flatMap((p) => [...occupiedBy([p], () => true)]);

    expect(new Set(cells).size).toBe(cells.length);
  });

  it("attack mode damages the target under the clicked cell and logs it", () => {
    const { result } = renderHook(() => useBattleMapPlayground());

    act(() => result.current.controls.nextTurn());
    act(() => result.current.setMap({ ...result.current.map, cols: 10, rows: 6 }));
    act(() => result.current.controls.setMode("attack"));

    const key = [...result.current.view.marks!.entries()].find(([, v]) => v === "target")![0];

    const targetId = result.current.participants.find((p) => p.basicInfo.side === "enemy" && occupiedBy([p], () => true).has(key))!.basicInfo.id;

    const hpBefore = result.current.participants.find((p) => p.basicInfo.id === targetId)!.combatStats.currentHp;

    act(() => result.current.actions.onCellClick(parse(key)));

    expect(result.current.participants.find((p) => p.basicInfo.id === targetId)!.combatStats.currentHp).toBe(hpBefore - 7);
    expect(result.current.log[0]).toMatchObject({ key: "hit", params: { damage: 7 } });
  });

  it("margin blocks the edge cells and keeps everyone on playable cells", () => {
    const { result } = renderHook(() => useBattleMapPlayground());

    act(() => result.current.setMargin(3));

    const blocked = new Set(result.current.map.blocked);

    expect(blocked.has("0:0")).toBe(true);
    expect(blocked.has("3:3")).toBe(false);
    expect(result.current.participants.every((p) => p.battleData.position && !blocked.has(`${p.battleData.position.x}:${p.battleData.position.y}`))).toBe(true);
  });
});
