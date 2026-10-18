// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { deriveScene, deriveTurn } from "../useBattleScene";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleScene } from "@/types/api";

const p = (id: string, controlledBy: string, side: ParticipantSide = ParticipantSide.ALLY) => {
  const b = createMockParticipant();

  return { ...b, basicInfo: { ...b.basicInfo, id, controlledBy, side } };
};

const battle = (turnIndex: number) =>
  ({ initiativeOrder: [p("gob", "dm", ParticipantSide.ENEMY), p("h1", "u1"), p("h2", "u1"), p("other", "u2")], currentTurnIndex: turnIndex, status: "active" }) as unknown as BattleScene;

describe("deriveTurn", () => {
  it("гравець з двома героями: hero — поточний, якщо це мій, інакше мій, хто ходитиме найближче", () => {
    expect(deriveTurn(battle(2), "u1", false, null)).toMatchObject({ isMyTurn: true, hero: { basicInfo: { id: "h2" } } });

    const waiting = deriveTurn(battle(0), "u1", false, null);

    expect(waiting.isMyTurn).toBe(false);
    expect(waiting.hero?.basicInfo.id).toBe("h1");

    const later = deriveTurn(battle(3), "u1", false, null);

    expect(later.hero?.basicInfo.id).toBe("h1");

    const order = [p("h1", "u1"), p("gob", "dm", ParticipantSide.ENEMY), p("h2", "u1")];

    const nextUp = deriveTurn({ initiativeOrder: order, currentTurnIndex: 1, currentRound: 1, status: "active" } as unknown as BattleScene, "u1", false, null);

    expect(nextUp.hero?.basicInfo.id).toBe("h2");
    expect(waiting.myParticipants.map((x) => x.basicInfo.id)).toEqual(["h1", "h2"]);
  });

  it("DM: хід ворога — його; взяв керування гравцем — його", () => {
    expect(deriveTurn(battle(0), "dm-user", true, null).isMyTurn).toBe(true);
    expect(deriveTurn(battle(3), "dm-user", true, null)).toMatchObject({ isMyTurn: false, hero: { basicInfo: { id: "other" } } });
    expect(deriveTurn(battle(3), "dm-user", true, "other")).toMatchObject({ isMyTurn: true, hero: { basicInfo: { id: "other" } } });
  });
});

describe("deriveTurn — завершений бій", () => {
  it("після завершення нічий хід не активний", () => {
    const done = { ...battle(1), status: "completed" } as unknown as BattleScene;

    expect(deriveTurn(done, "u1", false, null).isMyTurn).toBe(false);
    expect(deriveTurn(done, "dm-user", true, null).isMyTurn).toBe(false);
  });
});

describe("резерв і очікування рішення ДМ", () => {
  const dead = (id: string) => {
    const e = p(id, "dm", ParticipantSide.ENEMY);

    return { ...e, combatStats: { ...e.combatStats, currentHp: 0, status: "dead" as const } };
  };

  const imp = { ...p("imp", "dm", ParticipantSide.ENEMY), battleData: { ...createMockParticipant().battleData, reserved: true } };

  const scene = (isDM: boolean, pendingSummons = [imp]) =>
    ({ initiativeOrder: [p("h1", "u1"), dead("gob")], currentTurnIndex: 0, currentRound: 1, status: "active", isDM, pendingSummons }) as unknown as BattleScene;

  it("DM бачить резерв і awaiting", () => {
    const out = deriveScene(scene(true), "dm-user", null);

    expect(out.reserve.map((x) => x.basicInfo.id)).toEqual(["imp"]);
    expect(out.awaiting).toBe("victory");
  });

  it("гравець: резерв порожній, але awaiting відомий", () => {
    const out = deriveScene(scene(false), "u1", null);

    expect(out.reserve).toEqual([]);
    expect(out.awaiting).toBe("victory");
  });

  it("без резерву ворогів awaiting немає; завершений бій теж не awaiting", () => {
    expect(deriveScene(scene(true, []), "dm-user", null).awaiting).toBeNull();
    expect(deriveScene({ ...scene(true), status: "completed" } as unknown as BattleScene, "dm-user", null).awaiting).toBeNull();
  });

  it("під час awaiting ні в кого немає свого ходу", () => {
    expect(deriveScene(scene(false), "u1", null).isMyTurn).toBe(false);
    expect(deriveScene(scene(true), "dm-user", null).isMyTurn).toBe(false);
    expect(deriveTurn(scene(false), "u1", false, null).isMyTurn).toBe(true);
    expect(deriveTurn(scene(false), "u1", false, null, true).isMyTurn).toBe(false);
  });
});
