// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBattleMapScene } from "../useBattleMapScene";
import { fakeScene } from "./fake-scene";

import { mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";

function setup() {
  const scene = fakeScene({ isDM: true, map: mazeMap({ exit: { x: 7, y: 0 } }, 8, 6) });

  const hook = renderHook(() => useBattleMapScene(), { wrapper: scene.wrapper });

  const current = () => {
    if (!hook.result.current) throw new Error("scene is null");

    return hook.result.current;
  };

  return { current };
}

const openModePalette = (current: () => ReturnType<typeof setup>["current"] extends () => infer R ? R : never) =>
  act(() => (current().modeTools?.raw as { actions: { setTool(t: string): void } }).actions.setTool("fog"));

describe("палітри карти: режим, місцевість, погода", () => {
  it("відкриття палітри режиму закриває місцевість і погоду", () => {
    const { current } = setup();

    act(() => current().terrainTool?.toggle());
    expect(current().terrainTool?.active).toBe(true);

    openModePalette(current);

    expect(current().modeTools?.paletteOpen).toBe(true);
    expect(current().terrainTool?.active).toBe(false);

    act(() => current().weatherTool?.toggle());
    expect(current().weatherTool?.active).toBe(true);
    expect(current().modeTools?.paletteOpen).toBe(false);

    openModePalette(current);

    expect(current().modeTools?.paletteOpen).toBe(true);
    expect(current().weatherTool?.active).toBe(false);
  });

  it("відкриття місцевості закриває палітру режиму", () => {
    const { current } = setup();

    openModePalette(current);
    act(() => current().terrainTool?.toggle());

    expect(current().terrainTool?.active).toBe(true);
    expect(current().modeTools?.paletteOpen).toBe(false);
  });
});
