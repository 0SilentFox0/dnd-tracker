import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { buildClientDelta } from "@/lib/utils/battle/pipeline/client-delta";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import type { BattleParticipant } from "@/types/battle";

const p = (id: string, hp = 10, side = ParticipantSide.ALLY): BattleParticipant => {
  const base = createMockParticipant();

  return { ...base, basicInfo: { ...base.basicInfo, id, side }, combatStats: { ...base.combatStats, currentHp: hp } };
};

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 2, turnIndex: 1, version: 7,
  eventSeq: 10, pendingMoraleCheck: null, startedAt: new Date("2026-01-01"), completedAt: null,
};

const meta = { name: "Бій", description: null, setup: [], friendlyFire: false, createdAt: new Date() };

describe("buildClientDelta", () => {
  it("лише змінені учасники, без order, коли порядок той самий", () => {
    const a = p("a"), b = p("b"), b2 = p("b", 4);

    const d = buildClientDelta({
      before: { scene, meta, participants: [a, b], pending: [] },
      after: { ...scene, version: 8, turnIndex: 0 },
      participants: [a, b2],
      pending: [],
      upsertedIds: ["b"],
      log: [],
    });

    expect(d.version).toBe(8);
    expect(d.upserted).toEqual([b2]);
    expect(d.upserted[0]).toBe(b2);
    expect(d.removed).toEqual([]);
    expect(d.order).toBeUndefined();
    expect(d.pending).toBeUndefined();
    expect(d.scene).toMatchObject({ status: "active", round: 2, turnIndex: 0, startedAt: "2026-01-01T00:00:00.000Z" });
  });

  it("видалення і зміна порядку → removed + order", () => {
    const a = p("a"), b = p("b"), c = p("c");

    const d = buildClientDelta({
      before: { scene, meta, participants: [a, b, c], pending: [] },
      after: { ...scene, version: 8 },
      participants: [c, a],
      pending: [],
      upsertedIds: [],
      log: [],
    });

    expect(d.removed).toEqual(["b"]);
    expect(d.order).toEqual(["c", "a"]);
  });

  it("саммон у pending → повний список pending; переведення з pending в бій → order", () => {
    const a = p("a"), s = p("s", 5, ParticipantSide.ALLY);

    const toPending = buildClientDelta({
      before: { scene, meta, participants: [a], pending: [] },
      after: { ...scene, version: 8 },
      participants: [a],
      pending: [s],
      upsertedIds: ["s"],
      log: [],
    });

    expect(toPending.pending).toEqual([s]);
    expect(toPending.upserted).toEqual([]);

    const promoted = buildClientDelta({
      before: { scene, meta, participants: [a], pending: [s] },
      after: { ...scene, version: 9 },
      participants: [a, s],
      pending: [],
      upsertedIds: ["s"],
      log: [],
    });

    expect(promoted.pending).toEqual([]);
    expect(promoted.upserted).toEqual([s]);
    expect(promoted.order).toEqual(["a", "s"]);
    expect(promoted.removed).toEqual([]);
  });

  it("prepared → setup; журнал і cancelledFrom передаються як є", () => {
    const setup = [{ id: "u1", type: "unit" as const, side: ParticipantSide.ENEMY }];

    const d = buildClientDelta({
      before: { scene, meta: { ...meta, setup }, participants: [p("a")], pending: [] },
      after: { ...scene, status: "prepared", version: 8, round: 1, turnIndex: 0 },
      participants: [],
      pending: [],
      upsertedIds: [],
      log: [],
      cancelledFrom: 0,
    });

    expect(d.setup).toEqual(setup);
    expect(d.cancelledFrom).toBe(0);
    expect(d.removed).toEqual(["a"]);
    expect(d.order).toEqual([]);
  });
});
