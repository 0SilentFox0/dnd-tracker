// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMazePlaceUnit } from "../useMazePlaceUnit";
import { useMazeTools } from "../useMazeTools";
import { fakeScene } from "./fake-scene";

import { emptyMaze, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { MAZE_TEXTS } from "@/lib/constants/maze-texts";
import type { MazeConfig } from "@/types/battle";

function setup(maze: Partial<MazeConfig> = {}, isDM = true) {
  const scene = fakeScene({ isDM, map: { cols: 8, rows: 6, background: null, opacity: 0.3, maze: { ...emptyMaze(), ...maze } } });

  const maze$ = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };

  Object.assign(scene.value.actions, { maze: maze$ });

  const { result } = renderHook(() => ({ tools: useMazeTools(), placeUnit: useMazePlaceUnit() }), { wrapper: scene.wrapper });

  const tools = () => {
    const t = result.current.tools;

    if (!t) throw new Error("інструменти вимкнені");

    return t;
  };

  const stroke = () => {
    const e = tools().editing;

    if (!e) throw new Error("інструмент не активний");

    return e.stroke;
  };

  const placeUnit = () => {
    const place = result.current.placeUnit;

    if (!place) throw new Error("розміщення вимкнене");

    return place;
  };

  return { result, tools, stroke, placeUnit, mutate: maze$.mutate, scene };
}

describe("useMazeTools", () => {
  it("гравцеві інструменти вимкнені", () => {
    expect(setup({}, false).result.current.tools).toBeNull();
    expect(setup({}, false).result.current.placeUnit).toBeUndefined();
  });

  it("canGenerate — до першого кроку", () => {
    expect(setup().tools().state.canGenerate).toBe(true);
    expect(setup({ moved: true }).tools().state.canGenerate).toBe(false);
  });

  it("штрих по 3 ребрах — один запит add", () => {
    const { tools, stroke, mutate } = setup();

    act(() => tools().actions.setTool("walls"));
    act(() => stroke().begin("1:1:e"));
    act(() => stroke().enter("1:2:e"));
    act(() => stroke().enter("1:3:e"));

    expect(stroke().pending.size).toBe(3);

    act(() => stroke().end());

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ op: "walls", add: ["1:1:e", "1:2:e", "1:3:e"], remove: [] });
  });

  it("перше ребро — стіна: штрих прибирає лише стіни", () => {
    const { tools, stroke, mutate } = setup({ walls: ["1:1:e", "1:3:e"] });

    act(() => tools().actions.setTool("walls"));
    act(() => stroke().begin("1:1:e"));
    act(() => stroke().enter("1:2:e"));
    act(() => stroke().enter("1:3:e"));
    act(() => stroke().end());

    expect(mutate.mock.calls[0][0]).toEqual({ op: "walls", add: [], remove: ["1:1:e", "1:3:e"] });
  });

  it("телепорт — два кліки дають один запит із парою", () => {
    const { tools, mutate } = setup();

    act(() => tools().actions.setTool("teleport"));
    act(() => tools().actions.clickCell({ x: 1, y: 1 }));

    expect(mutate).not.toHaveBeenCalled();
    expect(tools().editing?.picked).toEqual({ x: 1, y: 1 });

    act(() => tools().actions.clickCell({ x: 6, y: 4 }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ op: "teleport", pair: [{ x: 1, y: 1 }, { x: 6, y: 4 }] });
    expect(tools().editing?.picked).toBeNull();
  });

  it("клік по наявному телепорту прибирає пару", () => {
    const { tools, mutate } = setup({ teleports: [[{ x: 1, y: 1 }, { x: 6, y: 4 }]] });

    act(() => tools().actions.setTool("teleport"));
    act(() => tools().actions.clickCell({ x: 6, y: 4 }));

    expect(mutate.mock.calls[0][0]).toEqual({ op: "teleport", pair: null, removeAt: { x: 6, y: 4 } });
  });

  it("вихід на некрайній клітинці — підказка без запиту", () => {
    const { tools, mutate, scene } = setup();

    act(() => tools().actions.setTool("exit"));
    act(() => tools().actions.clickCell({ x: 3, y: 3 }));

    expect(mutate).not.toHaveBeenCalled();
    expect(scene.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: MAZE_TEXTS.exitOnEdge }));

    act(() => tools().actions.clickCell({ x: 0, y: 3 }));

    expect(mutate.mock.calls[0][0]).toEqual({ op: "exit", cell: { x: 0, y: 3 } });
  });

  it("туман — клік перемикає клітинку", () => {
    const { tools, mutate } = setup({ fog: ["2:2"] });

    act(() => tools().actions.setTool("fog"));
    act(() => tools().actions.clickCell({ x: 2, y: 2 }));
    act(() => tools().actions.clickCell({ x: 3, y: 2 }));

    expect(mutate.mock.calls.map((c) => c[0])).toEqual([
      { op: "fog", cells: ["2:2"], on: false },
      { op: "fog", cells: ["3:2"], on: true },
    ]);
  });

  it("генерація з виходом «Вибрати на карті» чекає на крайню клітинку", () => {
    const { tools, mutate } = setup();

    act(() => tools().actions.generate({ difficulty: "hard", teleportPairs: 2, fogPatches: 3, exit: "pick" }));

    expect(mutate).not.toHaveBeenCalled();
    expect(tools().state.tool).toBe("exit");

    act(() => tools().actions.clickCell({ x: 7, y: 2 }));

    expect(mutate.mock.calls[0][0]).toEqual({ op: "generate", difficulty: "hard", teleportPairs: 2, fogPatches: 3, exit: { x: 7, y: 2 } });
    expect(tools().state.tool).toBe("none");
  });

  it("юніт із діалогу ставиться кліком по клітинці", () => {
    const { tools, placeUnit, scene } = setup();

    const body = { sourceId: "u1", type: ParticipantSourceType.UNIT, side: ParticipantSide.ENEMY, quantity: 1 };

    act(() => placeUnit()(body));

    expect(tools().state.tool).toBe("placeUnit");

    act(() => tools().actions.clickCell({ x: 4, y: 4 }));

    expect(scene.value.actions.addParticipant.mutate).toHaveBeenCalledWith({ ...body, position: { x: 4, y: 4 } });
    expect(tools().state.tool).toBe("none");
  });

  it("світло/темрява, розкидати старти, перетасувати", () => {
    const { tools, mutate } = setup({ dark: true });

    act(() => tools().actions.toggleDark());
    act(() => tools().actions.scatterStarts());
    act(() => tools().actions.reshuffle("scatter", { teleportPairs: 1, fogPatches: 0 }));

    expect(mutate.mock.calls.map((c) => c[0])).toEqual([
      { op: "dark", on: false },
      { op: "scatterStarts" },
      { op: "reshuffle", mode: "scatter", teleportPairs: 1, fogPatches: 0 },
    ]);
  });

  it("Esc вимикає інструмент", () => {
    const { tools } = setup();

    act(() => tools().actions.setTool("fog"));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(tools().state.tool).toBe("none");
  });
});
