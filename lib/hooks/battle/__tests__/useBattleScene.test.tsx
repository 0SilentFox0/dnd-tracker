// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { deriveTurn } from "../useBattleScene";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { BattleScene } from "@/types/api";

const p = (id: string, controlledBy: string, side = ParticipantSide.ALLY) => {
  const b = createMockParticipant();

  return { ...b, basicInfo: { ...b.basicInfo, id, controlledBy, side } };
};

const battle = (turnIndex: number) =>
  ({ initiativeOrder: [p("gob", "dm", ParticipantSide.ENEMY), p("h1", "u1"), p("h2", "u1"), p("other", "u2")], currentTurnIndex: turnIndex }) as unknown as BattleScene;

describe("deriveTurn", () => {
  it("гравець з двома героями: hero — поточний, якщо це мій, інакше мій, хто ходитиме найближче", () => {
    expect(deriveTurn(battle(2), "u1", false, null)).toMatchObject({ isMyTurn: true, hero: { basicInfo: { id: "h2" } } });

    const waiting = deriveTurn(battle(0), "u1", false, null);

    expect(waiting.isMyTurn).toBe(false);
    expect(waiting.hero?.basicInfo.id).toBe("h1");

    const later = deriveTurn(battle(3), "u1", false, null);

    expect(later.hero?.basicInfo.id).toBe("h1");

    const order = [p("h1", "u1"), p("gob", "dm", ParticipantSide.ENEMY), p("h2", "u1")];

    const nextUp = deriveTurn({ initiativeOrder: order, currentTurnIndex: 1, currentRound: 1 } as unknown as BattleScene, "u1", false, null);

    expect(nextUp.hero?.basicInfo.id).toBe("h2");
    expect(waiting.myParticipants.map((x) => x.basicInfo.id)).toEqual(["h1", "h2"]);
  });

  it("DM: хід ворога — його; взяв керування гравцем — його", () => {
    expect(deriveTurn(battle(0), "dm-user", true, null).isMyTurn).toBe(true);
    expect(deriveTurn(battle(3), "dm-user", true, null)).toMatchObject({ isMyTurn: false, hero: { basicInfo: { id: "other" } } });
    expect(deriveTurn(battle(3), "dm-user", true, "other")).toMatchObject({ isMyTurn: true, hero: { basicInfo: { id: "other" } } });
  });
});
