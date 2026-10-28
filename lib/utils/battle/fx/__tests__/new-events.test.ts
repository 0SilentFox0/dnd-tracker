import { describe, expect, it } from "vitest";

import { action } from "./action-fixture";

import { takeNewActions } from "@/lib/utils/battle/fx/new-events";
import { MAX_FX_BATCH } from "@/lib/utils/battle/fx/timing";
import type { BattleAction } from "@/types/battle";

const at = (i: number, over: Partial<BattleAction> = {}) => ({ ...action({ actionIndex: i, id: `b-${i}` }), ...over });

describe("takeNewActions", () => {
  it("first look marks everything as seen", () => {
    expect(takeNewActions([at(1), at(2)], null)).toEqual({ actions: [], seen: 2 });
  });

  it("empty log on first look → seen -1", () => {
    expect(takeNewActions([], null)).toEqual({ actions: [], seen: -1 });
  });

  it("returns entries newer than seen, oldest first", () => {
    expect(takeNewActions([at(1), at(3), at(2)], 1).actions.map((a) => a.actionIndex)).toEqual([2, 3]);
  });

  it("skips cancelled entries", () => {
    expect(takeNewActions([at(1), at(2, { isCancelled: true })], 1).actions).toEqual([]);
  });

  it("rollback (max index dropped) plays nothing and lowers seen", () => {
    expect(takeNewActions([at(1)], 4)).toEqual({ actions: [], seen: 1 });
  });

  it("history prepend (older entries only) plays nothing", () => {
    expect(takeNewActions([at(-5), at(-4), at(1), at(2)], 2).actions).toEqual([]);
  });

  it(`keeps only the newest ${MAX_FX_BATCH}`, () => {
    const log = Array.from({ length: MAX_FX_BATCH + 4 }, (_, i) => at(i + 1));

    expect(takeNewActions(log, 0).actions.map((a) => a.actionIndex)).toEqual(Array.from({ length: MAX_FX_BATCH }, (_, i) => i + 5));
  });
});
