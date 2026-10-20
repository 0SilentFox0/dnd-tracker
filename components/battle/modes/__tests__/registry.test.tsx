// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { MAZE_UI } from "../maze";
import { MAP_MODE_UI, modeUiOf } from "../registry";

import { testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { MAP_MODE_REGISTRY } from "@/lib/utils/battle/modes";
import { mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";

describe("реєстр UI режимів карти", () => {
  it("кожен режим реєстру має UI", () => {
    expect(Object.keys(MAP_MODE_UI).sort()).toEqual(Object.keys(MAP_MODE_REGISTRY).sort());
  });

  it("без карти й на звичайній карті UI немає", () => {
    expect(modeUiOf(null)).toBeNull();
    expect(modeUiOf(testMap(8, 6))).toBeNull();
  });

  it("карта з лабіринтом дає MAZE_UI, що ховає місцевість", () => {
    expect(modeUiOf(mazeMap({}, 8, 6))).toBe(MAZE_UI);
    expect(MAZE_UI.hidesTerrain).toBe(true);
  });
});
