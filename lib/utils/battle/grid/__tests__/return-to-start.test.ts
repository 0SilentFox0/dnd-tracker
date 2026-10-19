import { describe, expect, it } from "vitest";

import { returnToStartError } from "../return-to-start";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const maiden = (over: { flag?: boolean; attacked?: boolean; returned?: boolean; start?: boolean } = {}): BattleParticipant => {
  const { flag = true, attacked = true, returned = false, start = true } = over;

  const b = createMockParticipant();

  const p: BattleParticipant = {
    ...b,
    actionFlags: { ...b.actionFlags, hasUsedAction: attacked },
    battleData: {
      ...b.battleData,
      position: { x: 4, y: 2 },
      ...(start && { turnStartPosition: { x: 1, y: 2 } }),
      ...(returned && { returnedThisTurn: true }),
    },
  };

  return flag ? grantPassive(p, [{ kind: "flag", flag: "strikeAndReturn" }]) : p;
};

const err = (mover: BattleParticipant, others: BattleParticipant[] = []) => returnToStartError(map, [mover, ...others], mover);

describe("returnToStartError", () => {
  it("вільно: з прапорцем, після атаки", () => {
    expect(err(maiden())).toBeNull();
  });

  it("без прапорця — відмова", () => {
    expect(err(maiden({ flag: false }))).toBe("Повернутися неможливо");
  });

  it("до атаки — відмова", () => {
    expect(err(maiden({ attacked: false }))).toBe("Повернення доступне лише після атаки");
  });

  it("вже поверталася цього ходу — відмова", () => {
    expect(err(maiden({ returned: true }))).toBe("Повернутися неможливо");
  });

  it("немає стартової клітинки — відмова", () => {
    expect(err(maiden({ start: false }))).toBe("Повернутися неможливо");
  });

  it("стартову клітинку зайняли — без накладання", () => {
    const b = createMockParticipant();

    const blocker: BattleParticipant = {
      ...b,
      basicInfo: { ...b.basicInfo, id: "blocker", side: ParticipantSide.ENEMY },
      battleData: { ...b.battleData, position: { x: 1, y: 2 } },
    };

    expect(err(maiden(), [blocker])).toBe("Повернутися неможливо: клітинка зайнята");
  });
});
