import { describe, expect, it } from "vitest";

import { myTurnKey } from "@/lib/utils/battle/view/my-turn-key";
import type { BattleParticipant } from "@/types/battle";

const hero = (extraTurnActive?: boolean) => ({ basicInfo: { id: "h1" }, battleData: { extraTurnActive } }) as unknown as BattleParticipant;

describe("myTurnKey", () => {
  it("змінюється з раундом і додатковим ходом", () => {
    expect(myTurnKey(hero(), 2)).toBe("h1-2-n");
    expect(myTurnKey(hero(true), 2)).toBe("h1-2-x");
  });
});
