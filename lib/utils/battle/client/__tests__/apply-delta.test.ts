import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { acceptFullBattle, applyBattleDelta, prependBattleLog } from "@/lib/utils/battle/client/apply-delta";
import type { BattleScene, ClientBattleDelta } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";

const p = (id: string, hp = 10): BattleParticipant => {
  const base = createMockParticipant();

  return { ...base, basicInfo: { ...base.basicInfo, id }, combatStats: { ...base.combatStats, currentHp: hp } };
};

const entry = (actionIndex: number): BattleAction => ({ actionIndex, resultText: `#${actionIndex}` }) as BattleAction;

const a = p("a"), b = p("b");

const cached: BattleScene = {
  id: "b1", campaignId: "c1", name: "Бій", status: "active", participants: [], currentRound: 1, currentTurnIndex: 0,
  initiativeOrder: [a, b], pendingSummons: [], battleLog: [entry(1), entry(2)], createdAt: "x", version: 5,
  isDM: true, userRole: "dm", campaign: { id: "c1", friendlyFire: false },
};

const delta = (over: Partial<ClientBattleDelta> = {}): ClientBattleDelta => ({
  battleId: "b1", version: 6,
  scene: { status: "active", round: 1, turnIndex: 1, pendingMoraleCheck: null },
  upserted: [], removed: [], log: [], ...over,
});

describe("applyBattleDelta", () => {
  it("стара або та сама версія — кеш без змін (те саме посилання)", () => {
    expect(applyBattleDelta(cached, delta({ version: 5 }))).toBe(cached);
    expect(applyBattleDelta(cached, delta({ version: 3 }))).toBe(cached);
  });

  it("пропуск версії — refetch", () => {
    expect(applyBattleDelta(cached, delta({ version: 7 }))).toBe("refetch");
    expect(applyBattleDelta({ ...cached, version: undefined }, delta())).toBe("refetch");
  });

  it("послідовна — патч учасника, решта зберігає посилання, мета-поля кешу лишаються", () => {
    const b2 = p("b", 3);

    const next = applyBattleDelta(cached, delta({ upserted: [b2], log: [entry(3)] })) as BattleScene;

    expect(next.version).toBe(6);
    expect(next.currentTurnIndex).toBe(1);
    expect(next.initiativeOrder[0]).toBe(a);
    expect(next.initiativeOrder[1]).toBe(b2);
    expect(next.battleLog.map((e) => e.actionIndex)).toEqual([1, 2, 3]);
    expect(next).toMatchObject({ isDM: true, userRole: "dm", campaign: { id: "c1", friendlyFire: false } });
  });

  it("patched — мердж розділів поверх кешованого учасника; незмінені розділи й учасники зберігають посилання", () => {
    const effects = [{ id: "e1", name: "Кровотеча" }] as unknown as BattleParticipant["battleData"]["activeEffects"];

    const next = applyBattleDelta(
      cached,
      delta({ patched: [{ id: "b", combatStats: { currentHp: 2 }, battleData: { activeEffects: effects } }] }),
    ) as BattleScene;

    const merged = next.initiativeOrder[1];

    expect(next.initiativeOrder[0]).toBe(a);
    expect(merged.combatStats).toEqual({ ...b.combatStats, currentHp: 2 });
    expect(merged.battleData.activeEffects).toBe(effects);
    expect(merged.battleData.attacks).toBe(b.battleData.attacks);
    expect(merged.abilities).toBe(b.abilities);
    expect(merged.actionFlags).toBe(b.actionFlags);
  });

  it("patched на невідомий id — refetch", () => {
    expect(applyBattleDelta(cached, delta({ patched: [{ id: "ghost", combatStats: { currentHp: 1 } }] }))).toBe("refetch");
  });

  it("order + removed + pending", () => {
    const s = p("s");

    const next = applyBattleDelta(cached, delta({ removed: ["a"], order: ["b", "s"], upserted: [s], pending: [] })) as BattleScene;

    expect(next.initiativeOrder.map((x) => x.basicInfo.id)).toEqual(["b", "s"]);
    expect(next.pendingSummons).toEqual([]);
  });

  it("cancelledFrom скидає знання з сервера (бо воно могло спиратися на скасовані події), звичайна дельта — зберігає", () => {
    const knowledge = { b: { ac: { min: 12, max: 15, evidence: [] }, traits: [] } };

    const withKnowledge = { ...cached, knowledge };

    expect((applyBattleDelta(withKnowledge, delta()) as BattleScene).knowledge).toBe(knowledge);
    expect(applyBattleDelta(withKnowledge, delta({ cancelledFrom: 2 }))).not.toHaveProperty("knowledge");
    expect(applyBattleDelta(withKnowledge, delta({ cancelledFrom: 0 }))).not.toHaveProperty("knowledge");

    const fresh = { b: { ac: { min: 10, evidence: [] }, traits: [] } };

    expect((applyBattleDelta(withKnowledge, delta({ cancelledFrom: 2, knowledge: fresh })) as BattleScene).knowledge).toBe(fresh);
  });

  it("cancelledFrom обрізає журнал; повторне застосування тієї ж дельти — без змін", () => {
    const d = delta({ cancelledFrom: 2, log: [entry(2)] });

    const next = applyBattleDelta(cached, d) as BattleScene;

    expect(next.battleLog.map((e) => e.resultText)).toEqual(["#1", "#2"]);
    expect(applyBattleDelta(next, d)).toBe(next);
  });

  it("reset у prepared: setup і порожні учасники", () => {
    const setup = [{ id: "u1", type: "unit" as const, side: ParticipantSide.ENEMY }];

    const next = applyBattleDelta(cached, delta({
      scene: { status: "prepared", round: 1, turnIndex: 0, pendingMoraleCheck: null },
      removed: ["a", "b"], order: [], setup, cancelledFrom: 0,
    })) as BattleScene;

    expect(next.status).toBe("prepared");
    expect(next.initiativeOrder).toEqual([]);
    expect(next.participants).toEqual(setup);
    expect(next.battleLog).toEqual([]);
  });

  it("зворотний порядок: v7 раніше за v6 → refetch, потім v6 після refetch(v7) ігнорується", () => {
    expect(applyBattleDelta(cached, delta({ version: 7 }))).toBe("refetch");

    const refetched = { ...cached, version: 7 };

    expect(applyBattleDelta(refetched, delta({ version: 6 }))).toBe(refetched);
  });
});

describe("applyBattleDelta — відкат завершеного бою", () => {
  it("completedAt: null прибирає дату завершення з кешу", () => {
    const done = { ...cached, status: "completed" as const, completedAt: "2026-01-02T00:00:00.000Z" };

    const next = applyBattleDelta(done, delta({ scene: { status: "active", round: 1, turnIndex: 0, pendingMoraleCheck: null, completedAt: null } })) as BattleScene;

    expect(next.status).toBe("active");
    expect(next.completedAt).toBeUndefined();
  });
});

describe("acceptFullBattle", () => {
  it("зберігає isDM/userRole/campaign, якщо у відповіді їх немає; ігнорує старішу версію", () => {
    const incoming = { ...cached, version: 9, isDM: undefined, userRole: undefined, campaign: undefined };

    expect(acceptFullBattle(cached, incoming)).toMatchObject({ version: 9, isDM: true, userRole: "dm" });
    expect(acceptFullBattle(cached, { ...cached, version: 4 })).toBe(cached);
  });
});

describe("acceptFullBattle — журнал за межами вікна GET", () => {
  const withLog = (version: number, idx: number[]) => ({ ...cached, version, battleLog: idx.map(entry) });

  it("старіші записи з кешу лишаються, коли GET приніс лише останнє вікно", () => {
    const next = acceptFullBattle(withLog(5, [1, 2, 3, 4]), withLog(6, [3, 4, 5]));

    expect(next.battleLog.map((e) => e.actionIndex)).toEqual([1, 2, 3, 4, 5]);
  });

  it("записи, яких немає у вікні GET (скасовані відкатом), зникають; новий бій після reset — без старих", () => {
    expect(acceptFullBattle(withLog(5, [1, 2, 3, 4]), withLog(6, [2, 3])).battleLog.map((e) => e.actionIndex)).toEqual([1, 2, 3]);
    expect(acceptFullBattle(withLog(5, [1, 2, 3]), withLog(6, [1])).battleLog.map((e) => e.actionIndex)).toEqual([1]);
    expect(acceptFullBattle(withLog(5, [1, 2, 3]), withLog(6, [])).battleLog).toEqual([]);
  });
});

describe("acceptFullBattle — дірки в журналі", () => {
  const withLog = (version: number, idx: number[]) => ({ ...cached, version, battleLog: idx.map(entry) });

  it("кеш відстав більше ніж на вікно — старіші записи не доклеюються (їх дотягне пагінація)", () => {
    expect(acceptFullBattle(withLog(5, [1, 2, 3]), withLog(9, [20, 21])).battleLog.map((e) => e.actionIndex)).toEqual([20, 21]);
  });

  it("кеш закінчується впритул до вікна, але без перекриття — між ними міг бути відкат, не доклеюємо", () => {
    expect(acceptFullBattle(withLog(5, [1, 2, 3]), withLog(9, [4, 5])).battleLog.map((e) => e.actionIndex)).toEqual([4, 5]);
  });

  it("скасовані записи з кешу не доклеюються", () => {
    const log = [entry(1), { ...entry(2), isCancelled: true }, entry(3)];

    expect(acceptFullBattle({ ...cached, version: 5, battleLog: log }, withLog(9, [3, 4])).battleLog.map((e) => e.actionIndex)).toEqual([1, 3, 4]);
  });
});

describe("acceptFullBattle — інший запуск бою", () => {
  it("після reset (інший startedAt) старі записи з кешу не доклеюються", () => {
    const old = { ...cached, version: 5, startedAt: "2026-01-01T00:00:00.000Z", battleLog: [1, 2, 3].map(entry) };

    const rerun = { ...cached, version: 9, startedAt: "2026-01-02T00:00:00.000Z", battleLog: [3, 4].map(entry) };

    expect(acceptFullBattle(old, rerun).battleLog.map((e) => e.actionIndex)).toEqual([3, 4]);
  });
});

describe("prependBattleLog", () => {
  it("старіші події стають на початок журналу; дублікати не повторюються; решта кешу без змін", () => {
    const withLog = { ...cached, battleLog: [entry(4), entry(5)] };

    const next = prependBattleLog(withLog, [entry(2), entry(3), entry(4)]);

    expect(next.battleLog.map((e) => e.actionIndex)).toEqual([2, 3, 4, 5]);
    expect(next.battleLog[2]).toBe(withLog.battleLog[0]);
    expect(next.initiativeOrder).toBe(withLog.initiativeOrder);
    expect(next.version).toBe(withLog.version);
  });
});
