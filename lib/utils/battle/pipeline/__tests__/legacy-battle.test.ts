import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { buildPusherMessages, toLegacyBattle } from "@/lib/utils/battle/pipeline/legacy-battle";
import type { BattleSceneState } from "@/lib/utils/battle/store";

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 3,
  eventSeq: 4, pendingMoraleCheck: null, startedAt: null, completedAt: null,
};

const meta = { name: "Бій", description: null, setup: [{ id: "u1", type: "unit" as const, side: ParticipantSide.ENEMY }], friendlyFire: true, createdAt: new Date() };

const hero = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "hero", controlledBy: "u-player" } });

const goblin = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "gob", controlledBy: "dm" } });

describe("toLegacyBattle", () => {
  it("payload для інших клієнтів не містить isDM/userRole", () => {
    const b = toLegacyBattle({ meta }, scene, [hero], [], { mode: "append", entries: [] });

    expect(b).not.toHaveProperty("isDM");
    expect(b).not.toHaveProperty("userRole");
    expect(b.battleLogMode).toBe("append");
    expect(b.campaign).toEqual({ id: "c1", friendlyFire: true });
  });

  it("для того, хто діяв, — з isDM/userRole; лобі видно лише в prepared", () => {
    const active = toLegacyBattle({ meta }, scene, [hero], [], { mode: "full", entries: [] }, { isDM: true });

    expect(active).toMatchObject({ isDM: true, userRole: "dm", participants: [] });
    expect(active.battleLogMode).toBeUndefined();

    const prepared = toLegacyBattle({ meta }, { ...scene, status: "prepared" }, [], [], { mode: "full", entries: [] }, { isDM: false });

    expect(prepared.participants).toEqual(meta.setup);
    expect(prepared.userRole).toBe("player");
  });
});

describe("buildPusherMessages", () => {
  const payload = { battleId: "b1", version: 4, scene: { status: "active" as const, round: 1, turnIndex: 0, pendingMoraleCheck: null }, upserted: [], removed: [], log: [] };

  it("зміна ходу на гравця — battle-delta + turn-started у його канал", () => {
    const messages = buildPusherMessages({ before: { ...scene, turnIndex: 1 }, after: scene, participants: [hero, goblin], delta: payload });

    expect(messages.map((m) => m.event)).toEqual(["battle-delta", "battle-updated", "turn-started"]);
    expect(messages[2]).toMatchObject({ channel: "private-user-u-player", payload: { battleId: "b1", participantId: "hero" } });
  });

  it("хід переходить до DM-учасника — без turn-started", () => {
    expect(buildPusherMessages({ before: scene, after: { ...scene, turnIndex: 1 }, participants: [hero, goblin], delta: payload }).map((m) => m.event)).toEqual(["battle-delta", "battle-updated"]);
  });

  it("завершення бою — battle-completed; battle-started більше немає", () => {
    expect(buildPusherMessages({ before: { ...scene, status: "prepared" }, after: scene, participants: [hero], delta: payload }).map((m) => m.event)).toEqual(["battle-delta", "battle-updated", "turn-started"]);
    expect(buildPusherMessages({ before: scene, after: { ...scene, status: "completed" }, participants: [hero], delta: payload }).map((m) => m.event)).toContain("battle-completed");
  });

  it("велика дельта — refetch", () => {
    const big = { ...payload, upserted: Array.from({ length: 60 }, () => hero) };

    expect(buildPusherMessages({ before: scene, after: scene, participants: [hero], delta: big })[0].payload).toEqual({ battleId: "b1", version: 4, refetch: true });
  });

  it("сумісність зі старими вкладками: легкий battle-updated, який старий клієнт сприймає як рефетч", () => {
    const [, legacy] = buildPusherMessages({ before: scene, after: scene, participants: [hero], delta: payload });

    expect(legacy).toEqual({ channel: "private-battle-b1", event: "battle-updated", payload: { type: "battle-updated", battleId: "b1", version: 4 } });
  });
});
