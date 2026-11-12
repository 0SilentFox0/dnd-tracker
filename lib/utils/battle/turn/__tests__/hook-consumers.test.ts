import { beforeEach, describe, expect, it, vi } from "vitest";

import { advanceTurn } from "../advance-turn";

import { D6POOL_SYSTEM } from "@/lib/__tests__/fixtures/d6pool/definition";
import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import type { RuleSystemTurn } from "@/lib/utils/rules/systems/types";

const turn = vi.hoisted(() => ({ current: undefined as RuleSystemTurn | undefined }));

vi.mock("@/lib/utils/rules/systems", async (importOriginal) => {
  const system = () => ({ ...D6POOL_SYSTEM, combat: { ...D6POOL_SYSTEM.combat, turn: turn.current } });

  return { ...(await importOriginal<object>()), ruleSystemOf: system, ruleSystemByKey: system };
});

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 1,
  eventSeq: 0, pendingMoraleCheck: null, pendingChoice: null, startedAt: null, completedAt: null,
};

const base = createMockParticipant();

const a = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "a" } });

const b = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "b", side: ParticipantSide.ENEMY } });

const c = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "c", side: ParticipantSide.ENEMY } });

const run = () => advanceTurn({ rules: DEFAULT_RULES, participants: [a, b, c], pending: [], scene });

beforeEach(() => {
  turn.current = undefined;
});

describe("beforeAdvance result is honoured by advanceTurn", () => {
  it("messages reach the log", () => {
    turn.current = { beforeAdvance: [(ctx) => ({ participants: ctx.participants, messages: ["module-note"] })] };

    const out = run();

    expect(out.actions.map((x) => eventTextOf(x))).toEqual([expect.stringContaining("module-note")]);
    expect(out.scene.turnIndex).toBe(1);
  });

  it("pending holds the turn in place", () => {
    turn.current = { beforeAdvance: [(ctx) => ({ participants: ctx.participants, messages: [], pending: true })] };

    const out = run();

    expect(out.scene).toMatchObject({ turnIndex: 0, round: 1 });
  });

  it("skipTurn skips the ending participant's turn-end processing only", () => {
    const rich = { ...a, battleData: { ...a.battleData, pendingExtraActions: 2 } };

    const advance = () => advanceTurn({ rules: DEFAULT_RULES, participants: [rich, b, c], pending: [], scene });

    expect(advance().participants[0].battleData.pendingExtraActions).toBe(0);

    turn.current = { beforeAdvance: [(ctx) => ({ participants: ctx.participants, messages: [], skipTurn: true })] };

    const out = advance();

    expect(out.participants[0].battleData.pendingExtraActions).toBe(2);
    expect(out.scene.turnIndex).toBe(1);
  });
});

describe("onTurnStart result is honoured by the advance loop", () => {
  it("skipTurn passes the turn on to the next participant", () => {
    turn.current = { onTurnStart: [(ctx) => ({ participants: ctx.participants, messages: [], ...(ctx.id === "b" && { skipTurn: true as const }) })] };

    expect(run().scene.turnIndex).toBe(2);
  });

  it("pending stops the loop on that participant", () => {
    turn.current = { onTurnStart: [(ctx) => ({ participants: ctx.participants, messages: [], pending: true })] };

    expect(run().scene.turnIndex).toBe(1);
  });

  it("messages reach the log", () => {
    turn.current = { onTurnStart: [(ctx) => ({ participants: ctx.participants, messages: ["start-note"] })] };

    expect(run().actions.some((x) => eventTextOf(x).includes("start-note"))).toBe(true);
  });
});
