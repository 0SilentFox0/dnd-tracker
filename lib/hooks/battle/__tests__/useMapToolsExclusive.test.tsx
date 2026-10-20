// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBattleMapScene } from "../useBattleMapScene";
import { fakeScene } from "./fake-scene";

import type { MazeTools } from "@/lib/hooks/battle/modes/maze";
import { mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";

function setup() {
  const scene = fakeScene({ isDM: true, map: mazeMap({}, 8, 6) });

  Object.assign(scene.value.actions, { maze: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false } });

  const hook = renderHook(() => useBattleMapScene(), { wrapper: scene.wrapper });

  const current = () => {
    if (!hook.result.current) throw new Error("scene is null");

    return hook.result.current;
  };

  const maze = () => current().modeTools?.raw as MazeTools | undefined;

  return { current, maze };
}

describe("інструменти карти взаємовиключні", () => {
  it("погода закриває інструмент лабіринту", () => {
    const { current, maze } = setup();

    act(() => maze()?.actions.setTool("walls"));
    expect(maze()?.state.tool).toBe("walls");

    act(() => current().weatherTool?.toggle());

    expect(current().weatherTool?.active).toBe(true);
    expect(maze()?.state.tool).toBe("none");
  });

  it("інструмент лабіринту закриває палітру погоди", () => {
    const { current, maze } = setup();

    act(() => current().weatherTool?.toggle());
    expect(current().weatherTool?.active).toBe(true);

    act(() => maze()?.actions.setTool("exit"));

    expect(maze()?.state.tool).toBe("exit");
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
