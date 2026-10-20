// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMazeTools } from "../useMazeTools";
import { fakeScene } from "./fake-scene";

import { emptyMaze, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import type { MazeConfig } from "@/types/battle";

function setup(maze: Partial<MazeConfig> = {}, isDM = true) {
  const scene = fakeScene({ isDM, map: { cols: 8, rows: 6, background: null, opacity: 0.3, maze: { ...emptyMaze(), ...maze } } });

  const maze$ = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };

  Object.assign(scene.value.actions, { maze: maze$ });

  const { result } = renderHook(() => useMazeTools(), { wrapper: scene.wrapper });

  return { result, mutate: maze$.mutate, scene };
}

describe("useMazeTools", () => {
  it("гравцеві інструменти вимкнені", () => {
    expect(setup({}, false).result.current.enabled).toBe(false);
  });

  it("canGenerate — до першого кроку", () => {
    expect(setup().result.current.canGenerate).toBe(true);
    expect(setup({ moved: true }).result.current.canGenerate).toBe(false);
  });

  it("штрих по 3 ребрах — один запит add", () => {
    const { result, mutate } = setup();

    act(() => result.current.setTool("walls"));
    act(() => result.current.strokeEdges.begin("1:1:e"));
    act(() => result.current.strokeEdges.enter("1:2:e"));
    act(() => result.current.strokeEdges.enter("1:3:e"));

    expect(result.current.strokeEdges.pending.size).toBe(3);

    act(() => result.current.strokeEdges.end());

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ op: "walls", add: ["1:1:e", "1:2:e", "1:3:e"], remove: [] });
  });

  it("перше ребро — стіна: штрих прибирає лише стіни", () => {
    const { result, mutate } = setup({ walls: ["1:1:e", "1:3:e"] });

    act(() => result.current.strokeEdges.begin("1:1:e"));
    act(() => result.current.strokeEdges.enter("1:2:e"));
    act(() => result.current.strokeEdges.enter("1:3:e"));
    act(() => result.current.strokeEdges.end());

    expect(mutate.mock.calls[0][0]).toEqual({ op: "walls", add: [], remove: ["1:1:e", "1:3:e"] });
  });

  it("телепорт — два кліки дають один запит із парою", () => {
    const { result, mutate } = setup();

    act(() => result.current.setTool("teleport"));
    act(() => result.current.clickCell({ x: 1, y: 1 }));

    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.editing?.picked).toEqual({ x: 1, y: 1 });

    act(() => result.current.clickCell({ x: 6, y: 4 }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ op: "teleport", pair: [{ x: 1, y: 1 }, { x: 6, y: 4 }] });
    expect(result.current.editing?.picked).toBeNull();
  });

  it("клік по наявному телепорту прибирає пару", () => {
    const { result, mutate } = setup({ teleports: [[{ x: 1, y: 1 }, { x: 6, y: 4 }]] });

    act(() => result.current.setTool("teleport"));
    act(() => result.current.clickCell({ x: 6, y: 4 }));

    expect(mutate.mock.calls[0][0]).toEqual({ op: "teleport", pair: null, removeAt: { x: 6, y: 4 } });
  });

  it("вихід на некрайній клітинці — підказка без запиту", () => {
    const { result, mutate, scene } = setup();

    act(() => result.current.setTool("exit"));
    act(() => result.current.clickCell({ x: 3, y: 3 }));

    expect(mutate).not.toHaveBeenCalled();
    expect(scene.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Вихід — лише на краю карти" }));

    act(() => result.current.clickCell({ x: 0, y: 3 }));

    expect(mutate.mock.calls[0][0]).toEqual({ op: "exit", cell: { x: 0, y: 3 } });
  });

  it("туман — клік перемикає клітинку", () => {
    const { result, mutate } = setup({ fog: ["2:2"] });

    act(() => result.current.setTool("fog"));
    act(() => result.current.clickCell({ x: 2, y: 2 }));
    act(() => result.current.clickCell({ x: 3, y: 2 }));

    expect(mutate.mock.calls.map((c) => c[0])).toEqual([
      { op: "fog", cells: ["2:2"], on: false },
      { op: "fog", cells: ["3:2"], on: true },
    ]);
  });

  it("генерація з виходом «Вибрати на карті» чекає на крайню клітинку", () => {
    const { result, mutate } = setup();

    act(() => result.current.generate({ difficulty: "hard", teleportPairs: 2, fogPatches: 3, exit: "pick" }));

    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.tool).toBe("exit");

    act(() => result.current.clickCell({ x: 7, y: 2 }));

    expect(mutate.mock.calls[0][0]).toEqual({ op: "generate", difficulty: "hard", teleportPairs: 2, fogPatches: 3, exit: { x: 7, y: 2 } });
    expect(result.current.tool).toBe("none");
  });

  it("юніт із діалогу ставиться кліком по клітинці", () => {
    const { result, scene } = setup();

    const body = { sourceId: "u1", type: ParticipantSourceType.UNIT, side: ParticipantSide.ENEMY, quantity: 1 };

    act(() => result.current.placeUnit(body));

    expect(result.current.tool).toBe("placeUnit");

    act(() => result.current.clickCell({ x: 4, y: 4 }));

    expect(scene.value.actions.addParticipant.mutate).toHaveBeenCalledWith({ ...body, position: { x: 4, y: 4 } });
    expect(result.current.tool).toBe("none");
  });

  it("світло/темрява, розкидати старти, перетасувати", () => {
    const { result, mutate } = setup({ dark: true });

    act(() => result.current.toggleDark());
    act(() => result.current.scatterStarts());
    act(() => result.current.reshuffle("scatter", { teleportPairs: 1, fogPatches: 0 }));

    expect(mutate.mock.calls.map((c) => c[0])).toEqual([
      { op: "dark", on: false },
      { op: "scatterStarts" },
      { op: "reshuffle", mode: "scatter", teleportPairs: 1, fogPatches: 0 },
    ]);
  });

  it("Esc вимикає інструмент", () => {
    const { result } = setup();

    act(() => result.current.setTool("fog"));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(result.current.tool).toBe("none");
  });
});
