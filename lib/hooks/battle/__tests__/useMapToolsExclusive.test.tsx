// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBattleMapScene } from "../useBattleMapScene";
import { fakeScene } from "./fake-scene";

import { mazeMap } from "@/lib/utils/battle/maze/__tests__/fixtures";

function setup() {
  const scene = fakeScene({ isDM: true, map: mazeMap({}, 8, 6) });

  Object.assign(scene.value.actions, { maze: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false } });

  const hook = renderHook(() => useBattleMapScene(), { wrapper: scene.wrapper });

  const current = () => {
    if (!hook.result.current) throw new Error("scene is null");

    return hook.result.current;
  };

  return { current };
}

describe("інструменти карти взаємовиключні", () => {
  it("погода закриває інструмент лабіринту", () => {
    const { current } = setup();

    act(() => current().mazeTools?.actions.setTool("walls"));
    expect(current().mazeTools?.state.tool).toBe("walls");

    act(() => current().weatherTool?.toggle());

    expect(current().weatherTool?.active).toBe(true);
    expect(current().mazeTools?.state.tool).toBe("none");
  });

  it("інструмент лабіринту закриває палітру погоди", () => {
    const { current } = setup();

    act(() => current().weatherTool?.toggle());
    expect(current().weatherTool?.active).toBe(true);

    act(() => current().mazeTools?.actions.setTool("exit"));

    expect(current().mazeTools?.state.tool).toBe("exit");
    expect(current().weatherTool?.active).toBe(false);
  });

  it("погода закриває пензель terrain, а terrain — погоду", () => {
    const { current } = setup();

    act(() => current().terrainTool?.toggle());
    act(() => current().weatherTool?.toggle());
    expect(current().terrainTool?.active).toBe(false);
    expect(current().weatherTool?.active).toBe(true);

    act(() => current().terrainTool?.toggle());
    expect(current().terrainTool?.active).toBe(true);
    expect(current().weatherTool?.active).toBe(false);
  });
});
