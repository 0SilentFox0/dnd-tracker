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
  it("зміна HP наявного учасника — лише патч поля, без order, коли порядок той самий", () => {
    const a = p("a"), b = p("b"), b2 = p("b", 4);

    const d = buildClientDelta({
      before: { scene, meta, participants: [a, b], pending: [] },
      after: { ...scene, version: 8, turnIndex: 0 },
      participants: [a, b2],
      pending: [],
      stored: [b2],
      fullIds: [],
      log: [],
    });

    expect(d.version).toBe(8);
    expect(d.upserted).toEqual([]);
    expect(d.patched).toEqual([{ id: "b", combatStats: { currentHp: 4 } }]);
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
      stored: [],
      fullIds: [],
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
      stored: [s],
      fullIds: [],
      log: [],
    });

    expect(toPending.pending).toEqual([s]);
    expect(toPending.upserted).toEqual([]);

    const promoted = buildClientDelta({
      before: { scene, meta, participants: [a], pending: [s] },
      after: { ...scene, version: 9 },
      participants: [a, s],
      pending: [],
      stored: [s],
      fullIds: [],
      log: [],
    });

    expect(promoted.pending).toEqual([]);
    expect(promoted.upserted).toEqual([s]);
    expect(promoted.patched).toBeUndefined();
    expect(promoted.order).toEqual(["a", "s"]);
    expect(promoted.removed).toEqual([]);
  });

  it("змінений знімок або видалене поле стану — повний учасник; зміна лише orderIndex — нічого", () => {
    const a = p("a"), b = p("b"), c = p("c");

    const a2 = { ...a, combatStats: { ...a.combatStats, armorClass: 30 } };

    const { abilityUsage: _drop, ...bData } = { ...b.battleData, abilityUsage: {} };

    void _drop;

    const d = buildClientDelta({
      before: { scene, meta, participants: [a, { ...b, battleData: { ...b.battleData, abilityUsage: {} } }, c], pending: [] },
      after: { ...scene, version: 8 },
      participants: [a2, { ...b, battleData: bData }, c],
      pending: [],
      stored: [a2, { ...b, battleData: bData }, c],
      fullIds: ["a"],
      log: [],
    });

    expect(d.upserted.map((x) => x.basicInfo.id)).toEqual(["a", "b"]);
    expect(d.patched).toBeUndefined();
  });

  it("prepared → setup; журнал і cancelledFrom передаються як є", () => {
    const setup = [{ id: "u1", type: "unit" as const, side: ParticipantSide.ENEMY }];

    const d = buildClientDelta({
      before: { scene, meta: { ...meta, setup }, participants: [p("a")], pending: [] },
      after: { ...scene, status: "prepared", version: 8, round: 1, turnIndex: 0 },
      participants: [],
      pending: [],
      stored: [],
      fullIds: [],
      log: [],
      cancelledFrom: 0,
    });

    expect(d.setup).toEqual(setup);
    expect(d.cancelledFrom).toBe(0);
    expect(d.removed).toEqual(["a"]);
    expect(d.order).toEqual([]);
  });

  it("патчі й pending будуються зі збереженої форми, а не з сирого виводу рушія", () => {
    const a = p("a"), s = p("s");

    const raw = { ...a, combatStats: { ...a.combatStats, currentHp: 37.5, maxHp: 37.5 } };

    const stored = { ...a, combatStats: { ...a.combatStats, currentHp: 38, maxHp: 38 } };

    const rawSummon = { ...s, combatStats: { ...s.combatStats, maxHp: 12.5 } };

    const storedSummon = { ...s, combatStats: { ...s.combatStats, maxHp: 13 } };

    const d = buildClientDelta({
      before: { scene, meta, participants: [a], pending: [] },
      after: { ...scene, version: 8 },
      participants: [raw],
      pending: [rawSummon],
      stored: [stored, storedSummon],
      fullIds: [],
      log: [],
    });

    expect(d.patched).toEqual([{ id: "a", combatStats: { currentHp: 38, maxHp: 38 } }]);
    expect(d.pending).toEqual([storedSummon]);
  });

  it("відкат із completed → completedAt: null, щоб клієнт прибрав позначку завершення", () => {
    const a = p("a");

    const done = { ...scene, status: "completed" as const, completedAt: new Date("2026-01-02") };

    const d = buildClientDelta({
      before: { scene: done, meta, participants: [a], pending: [] },
      after: { ...scene, version: 8 },
      participants: [a],
      pending: [],
      stored: [],
      fullIds: [],
      log: [],
      cancelledFrom: 5,
    });

    expect(d.scene).toMatchObject({ status: "active", completedAt: null });
  });
});
