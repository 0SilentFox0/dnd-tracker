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
  const payload = toLegacyBattle({ meta }, scene, [hero, goblin], [], { mode: "append", entries: [] });

  it("зміна ходу на гравця — battle-updated + turn-started у його канал", () => {
    const messages = buildPusherMessages({ before: { ...scene, turnIndex: 1 }, after: scene, participants: [hero, goblin], battlePayload: payload });

    expect(messages.map((m) => m.event)).toEqual(["battle-updated", "turn-started"]);
    expect(messages[1]).toMatchObject({ channel: "private-user-u-player", payload: { battleId: "b1", participantId: "hero" } });
  });

  it("хід переходить до DM-учасника — без turn-started", () => {
    const messages = buildPusherMessages({ before: scene, after: { ...scene, turnIndex: 1 }, participants: [hero, goblin], battlePayload: payload });

    expect(messages.map((m) => m.event)).toEqual(["battle-updated"]);
  });

  it("старт і завершення бою", () => {
    expect(buildPusherMessages({ before: { ...scene, status: "prepared" }, after: scene, participants: [hero], battlePayload: payload }).map((m) => m.event)).toContain("battle-started");
    expect(buildPusherMessages({ before: scene, after: { ...scene, status: "completed" }, participants: [hero], battlePayload: payload }).map((m) => m.event)).toContain("battle-completed");
  });

  it("великий payload — light {type, battleId}", () => {
    const big = { ...payload, initiativeOrder: Array.from({ length: 60 }, () => hero) };

    const [updated] = buildPusherMessages({ before: scene, after: scene, participants: [hero], battlePayload: big });

    expect(updated.payload).toEqual({ type: "battle-updated", battleId: "b1", version: 3 });
  });
});
