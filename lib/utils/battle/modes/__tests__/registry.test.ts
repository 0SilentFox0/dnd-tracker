import { describe, expect, it } from "vitest";

import { activeMapMode, NORMAL_MODE } from "@/lib/utils/battle/modes";
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
});
