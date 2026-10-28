import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { coreActionMutation } from "@/lib/server/battles/mutations/core-action/core-action-mutation";
import { BattleAccessError } from "@/lib/utils/battle/store";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const on = (over: Parameters<typeof context>[0] = {}) => {
  const base = context(over);

  return { ...base, meta: { ...base.meta, rules: { ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true } } } };
};

describe("core-action mutation", () => {
  it("вимкнені правила — відмова", () => {
    expect(() => coreActionMutation(context(), { action: "dodge", participantId: "hero" })).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });

  it("гравець діє своїм учасником у свій хід і пише подію", () => {
    const out = coreActionMutation(on(), { action: "dodge", participantId: "hero" });

    expect(out.participants[0].actionFlags.hasUsedAction).toBe(true);
    expect(out.events).toHaveLength(1);
  });

  it("гравець не діє чужим і не в чужий хід; ДМ діє юнітом на його ході", () => {
    expect(() => coreActionMutation(on(), { action: "dodge", participantId: "gob" })).toThrow(BattleAccessError);

    const gobTurn = on({ participants: [goblin, hero] });

    expect(() => coreActionMutation(gobTurn, { action: "dodge", participantId: "hero" })).toThrow(BattleAccessError);

    const dm = { ...gobTurn, userId: "dm", isDM: true };

    expect(coreActionMutation(dm, { action: "dash", participantId: "gob" }).participants[0].actionFlags.hasUsedAction).toBe(true);
    expect(() => coreActionMutation(dm, { action: "dash", participantId: "hero" })).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });

  it("grapple несуміжного ворога без карти проходить маршрут і витрачає дію", () => {
    const out = coreActionMutation(on(), { action: "grapple", participantId: "hero", targetId: "gob" });

    expect(out.participants[0].actionFlags.hasUsedAction).toBe(true);
    expect(out.events).toHaveLength(1);
  });

  it("readiedAttack: власник на чужому ході проходить гейт; чужий гравець — 403", () => {
    const gobTurn = on({ participants: [goblin, hero] });

    const body = { action: "readiedAttack" as const, participantId: "hero", targetId: "gob" };

    expect(() => coreActionMutation(gobTurn, body)).toThrow(expect.objectContaining({ message: "Атаку не підготовлено" }));
    expect(() => coreActionMutation(gobTurn, { ...body, participantId: "gob", targetId: "hero" })).toThrow(BattleAccessError);
    expect(() => coreActionMutation({ ...gobTurn, userId: "dm", isDM: true }, body)).toThrow(expect.objectContaining({ message: "Атаку не підготовлено" }));
  });

  it("очікувана перевірка моралі блокує дії ядра у свій хід", () => {
    const base = on();

    const shaken = { ...base, participants: [{ ...base.participants[0], combatStats: { ...base.participants[0].combatStats, morale: 3 } }, base.participants[1]] };

    expect(() => coreActionMutation(shaken, { action: "dodge", participantId: "hero" })).toThrow(expect.objectContaining({ message: "Спершу потрібна перевірка моралі" }));
  });
});

