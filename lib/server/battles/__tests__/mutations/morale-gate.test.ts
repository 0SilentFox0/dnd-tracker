import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { attackBodySchema, attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { moveMutation } from "@/lib/server/battles/mutations/move/move-mutation";
import { nextTurnMutation } from "@/lib/server/battles/mutations/next-turn/next-turn-mutation";
import { REJECT } from "@/lib/utils/battle/store/reject";
import type { BattleParticipant } from "@/types/battle";

const map = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const withMorale = (p: BattleParticipant, morale: number, position: { x: number; y: number }): BattleParticipant => ({
  ...p,
  combatStats: { ...p.combatStats, morale, speed: 30 },
  battleData: { ...p.battleData, position },
});

const ctx = (over: Parameters<typeof context>[0] = {}) => {
  const base = context({ participants: [withMorale(hero, 2, { x: 0, y: 0 }), withMorale(goblin, 0, { x: 9, y: 4 })], ...over });

  return { ...base, meta: { ...base.meta, map } };
};

const resolvedScene = (c: ReturnType<typeof ctx>) => ({
  ...c.scene,
  pendingMoraleCheck: { participantId: "hero", d10Roll: 3, moraleResult: { shouldSkipTurn: false, hasExtraTurn: false, message: "", moralePositive: true } },
});

const move = { participantId: "hero", to: { x: 2, y: 0 } };

describe("мораль блокує дії до перевірки", () => {
  it("рух відхилено, поки перевірку моралі не пройдено", () => {
    expect(() => moveMutation(ctx(), move)).toThrow(expect.objectContaining({ code: "action_rejected", message: REJECT.moraleFirst }));
  });

  it("атака відхилена до перевірки моралі", async () => {
    const run = attackMutation(ctx(), attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "x", d20Roll: 10, damageRolls: [1] }));

    await expect(run).rejects.toMatchObject({ code: "action_rejected" });
  });

  it("завершення ходу гравцем відхилено до перевірки, ДМ може", () => {
    expect(() => nextTurnMutation(ctx())).toThrow(expect.objectContaining({ code: "action_rejected" }));
    expect(() => nextTurnMutation(ctx({ isDM: true }))).not.toThrow();
  });

  it("після перевірки моралі рух дозволено", () => {
    const c = ctx();

    const out = moveMutation({ ...c, scene: resolvedScene(c) }, move);

    expect(out.participants[0].battleData.position).toEqual({ x: 2, y: 0 });
  });

  it("нейтральна мораль чи додатковий хід перевірки не потребують", () => {
    const neutral = ctx({ participants: [withMorale(hero, 0, { x: 0, y: 0 }), withMorale(goblin, 0, { x: 9, y: 4 })] });

    expect(() => moveMutation(neutral, move)).not.toThrow();

    const extra = ctx();

    extra.participants[0] = { ...extra.participants[0], battleData: { ...extra.participants[0].battleData, extraTurnActive: true } };
    expect(() => moveMutation(extra, move)).not.toThrow();
  });

  it("розстановка ДМ чужого токена перевірки не потребує", () => {
    const out = moveMutation(ctx({ isDM: true }), { participantId: "gob", to: { x: 5, y: 2 } });

    expect(out.participants[1].battleData.position).toEqual({ x: 5, y: 2 });
  });
});
