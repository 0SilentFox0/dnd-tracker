import { describe, expect, it } from "vitest";

import { findLastSpellAction } from "@/lib/utils/battle/battle-log";
import type { BattleAction } from "@/types/battle";

const entry = (actionType: BattleAction["actionType"], actionIndex: number) => ({ actionType, actionIndex }) as BattleAction;

describe("findLastSpellAction", () => {
  it("знаходить заклинання, навіть якщо після нього записано перемогу", () => {
    expect(findLastSpellAction([entry("spell", 4), entry("end_turn", 5)])?.actionIndex).toBe(4);
  });

  it("без заклинань — undefined", () => {
    expect(findLastSpellAction([entry("attack", 1)])).toBeUndefined();
    expect(findLastSpellAction(undefined)).toBeUndefined();
  });
});
