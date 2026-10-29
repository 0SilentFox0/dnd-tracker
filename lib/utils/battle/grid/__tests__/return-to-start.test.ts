import { describe, expect, it } from "vitest";

import { checkReturnToStart } from "../return-to-start";

import { ParticipantSide } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { REJECT } from "@/lib/utils/battle/store/reject";
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

const check = (mover: BattleParticipant, others: BattleParticipant[] = []) => checkReturnToStart(map, [mover, ...others], mover);

const err = (mover: BattleParticipant, others: BattleParticipant[] = []) => {
  const r = check(mover, others);

  return r.ok ? null : r.error;
};

describe("checkReturnToStart", () => {
  it("вільно: з прапорцем, після атаки", () => {
    expect(err(maiden())).toBeNull();
    expect(check(maiden())).toEqual({ ok: true, to: { x: 1, y: 2 } });
  });

  it("без карти — відмова", () => {
    expect(checkReturnToStart(null, [maiden()], maiden())).toEqual({ ok: false, error: textRef(REJECT.returnImpossible) });
  });

  it("без прапорця — відмова", () => {
    expect(err(maiden({ flag: false }))).toEqual(textRef(REJECT.returnImpossible));
  });

  it("до атаки — відмова", () => {
    expect(err(maiden({ attacked: false }))).toEqual(textRef(REJECT.returnAfterAttack));
  });

  it("вже поверталася цього ходу — відмова", () => {
    expect(err(maiden({ returned: true }))).toEqual(textRef(REJECT.returnImpossible));
  });

  it("немає стартової клітинки — відмова", () => {
    expect(err(maiden({ start: false }))).toEqual(textRef(REJECT.returnImpossible));
  });

  it("стартову клітинку зайняли — без накладання", () => {
    const b = createMockParticipant();

    const blocker: BattleParticipant = {
      ...b,
      basicInfo: { ...b.basicInfo, id: "blocker", side: ParticipantSide.ENEMY },
      battleData: { ...b.battleData, position: { x: 1, y: 2 } },
    };

    expect(err(maiden(), [blocker])).toEqual(textRef(REJECT.returnOccupied));
  });
});
