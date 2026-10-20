import { describe, expect, it } from "vitest";

import { activeMapMode, allMapModes, NORMAL_MODE, registerTestMode } from "@/lib/utils/battle/modes";
import { mazeMode } from "@/lib/utils/battle/modes/maze";
import { emptyMaze } from "@/lib/utils/battle/modes/maze/constants";
import type { BattleMapConfig } from "@/types/battle";

const base: BattleMapConfig = { cols: 10, rows: 8 } as BattleMapConfig;

describe("activeMapMode", () => {
  it("без карти — звичайний режим", () => {
    expect(activeMapMode(null)).toBe(NORMAL_MODE);
    expect(activeMapMode(undefined)).toBe(NORMAL_MODE);
  });

  it("карта без конфігу режиму — звичайний режим", () => {
    expect(activeMapMode(base)).toBe(NORMAL_MODE);
    expect(activeMapMode({ ...base, maze: null })).toBe(NORMAL_MODE);
  });

  it("NORMAL_MODE не має хуків", () => {
    expect(NORMAL_MODE.key).toBe("normal");
    expect(NORMAL_MODE.server).toEqual({});
    expect(NORMAL_MODE.engine).toEqual({});
    expect(NORMAL_MODE.client).toEqual({});
  });

  it("карта з лабіринтом — режим maze", () => {
    expect(activeMapMode({ ...base, maze: emptyMaze() })).toBe(mazeMode);
    expect(mazeMode.configOf({ ...base, maze: emptyMaze() })).toEqual(emptyMaze());
    expect(mazeMode.withConfig(base, null).maze).toBeNull();
  });
});

describe("registerTestMode", () => {
  it("повторне зняття не чіпає інші режими", () => {
    const a = { ...NORMAL_MODE, key: "a" } as never;

    const b = { ...NORMAL_MODE, key: "b" } as never;

    const offA = registerTestMode(a);

    const offB = registerTestMode(b);

    offA();
    offA();

    expect(allMapModes()).toContain(b);
    expect(allMapModes()).not.toContain(a);

    offB();
  });
});
