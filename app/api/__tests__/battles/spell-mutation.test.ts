import type { Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { createSpellMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";

const spellRow = {
  id: "s1",
  campaignId: "c1",
  name: "Вогняна стріла",
  level: 1,
  type: "target",
  target: "enemies",
  damageType: "damage",
  damageElement: "fire",
  groupId: null,
  damageModifier: null,
  healModifier: null,
  diceCount: 1,
  diceType: "d10",
  savingThrow: null,
  hitCheck: null,
  description: "",
  duration: null,
  castingTime: "1 action",
  effects: [],
  damageDistribution: null,
  effectDetails: null,
  icon: null,
  summonUnitId: null,
} as unknown as Spell;

const caster = participant("hero", { controlledBy: "user-1" }, {
  spellcasting: { spellSlots: { "1": { max: 2, current: 2 } }, knownSpells: ["s1"] },
});

function mutation(row: Spell | null = spellRow) {
  return createSpellMutation({ loadSpell: vi.fn(async () => row), summon: vi.fn() });
}

const body = (over: Record<string, unknown> = {}) => ({
  casterId: "hero",
  spellId: "s1",
  targetIds: ["gob"],
  damageRolls: [6],
  ...over,
});

describe("spell mutation", () => {
  it("каст: одна подія, учасники оновлені", async () => {
    const out = await mutation()(context({ participants: [caster, goblin] }), body() as never);

    expect(out.events).toHaveLength(1);
    expect(out.participants).toHaveLength(2);
  });

  it("preview: учасники не змінюються, у response — battleAction", async () => {
    const ctx = context({ participants: [caster, goblin] });

    const out = await mutation()(ctx, body({ preview: true }) as never);

    expect(out.participants).toBe(ctx.participants);
    expect(out.events).toEqual([]);
    expect(out.response).toMatchObject({ preview: true });
    expect(out.response?.battleAction).toBeDefined();
  });

  it("кастера немає — 404", async () => {
    await expect(mutation()(context(), body({ casterId: "nobody" }) as never)).rejects.toMatchObject({ status: 404 });
  });

  it("не свій хід і не DM — 403", async () => {
    await expect(
      mutation()(context({ participants: [goblin, caster] }), body() as never),
    ).rejects.toBeInstanceOf(BattleAccessError);
  });

  it("непритомний кастер — participant_dead", async () => {
    const downed = { ...caster, combatStats: { ...caster.combatStats, status: "unconscious" as const } };

    await expect(mutation()(context({ participants: [downed, goblin] }), body() as never)).rejects.toMatchObject({
      code: "participant_dead",
    });
  });

  it("невідомий спел для гравця — action_rejected", async () => {
    await expect(mutation()(context({ participants: [hero, goblin] }), body() as never)).rejects.toMatchObject({
      code: "action_rejected",
    });
  });

  it("спел іншої кампанії — 404", async () => {
    await expect(
      mutation({ ...spellRow, campaignId: "other" } as Spell)(context({ participants: [caster, goblin] }), body() as never),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("дія вже використана — action_used", async () => {
    const used = { ...caster, actionFlags: { ...caster.actionFlags, hasUsedAction: true } };

    await expect(mutation()(context({ participants: [used, goblin] }), body() as never)).rejects.toBeInstanceOf(
      BattleRuleError,
    );
  });

  it("неможливий кидок шкоди заклинання (99 на d10) — invalid_dice", async () => {
    await expect(mutation()(context({ participants: [caster, goblin] }), body({ damageRolls: [99] }) as never)).rejects.toMatchObject({
      code: "invalid_dice",
    });
  });

  it("кастер у паніці — action_used", async () => {
    const panic = { participantId: "hero", d10Roll: 1, moraleResult: { shouldSkipTurn: true, hasExtraTurn: false, moralePositive: false, message: "" } };

    const ctx = context({ participants: [caster, goblin] });

    await expect(mutation()({ ...ctx, scene: { ...ctx.scene, pendingMoraleCheck: panic } }, body() as never)).rejects.toMatchObject({ code: "action_used" });
  });

  it("spell summon gets the caster's controller", async () => {
    const summon = vi.fn(async (params: { orderAfterSpell: unknown[] }) => ({ finalOrder: params.orderAfterSpell as never[], summoned: null }));

    const m = createSpellMutation({ loadSpell: vi.fn(async () => ({ ...spellRow, summonUnitId: "u1" }) as Spell), summon: summon as never });

    await m(context({ participants: [caster, goblin] }), body() as never);

    expect(summon).toHaveBeenCalledWith(expect.objectContaining({ casterControlledBy: "user-1" }));
  });

  describe("spellTargeting", () => {
    const withFlag = (mode: "area" | "all", extra: Partial<{ maxTargets: number }> = {}) => ({
      ...caster,
      battleData: { ...caster.battleData, resolvedAbilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellTargeting", mode, ...extra }] })] },
    });

    const gob2 = participant("gob2", { side: goblin.basicInfo.side, controlledBy: "dm", name: "Гоблін 2" });

    const hpOf = (out: { participants: { basicInfo: { id: string }; combatStats: { currentHp: number } }[] }, id: string) =>
      out.participants.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

    it("all розширює цілі звичайного закляття на всю сторону", async () => {
      const out = await mutation()(context({ participants: [withFlag("all"), goblin, gob2] }), body({ damageRolls: [6, 6] }) as never);

      expect(hpOf(out, "gob2")).toBeLessThan(gob2.combatStats.currentHp);
    });

    it("aoe-закляття лишається з вибраними цілями попри all", async () => {
      const aoe = { ...spellRow, type: "aoe" } as Spell;

      const out = await mutation(aoe)(context({ participants: [withFlag("all"), goblin, gob2] }), body() as never);

      expect(hpOf(out, "gob2")).toBe(gob2.combatStats.currentHp);
    });

    it("більше цілей, ніж дозволяє область — 422 (BattleRuleError)", async () => {
      const ctx = context({ participants: [withFlag("area", { maxTargets: 2 }), goblin, gob2, participant("gob3", { side: goblin.basicInfo.side })] });

      await expect(mutation()(ctx, body({ targetIds: ["gob", "gob2", "gob3"], damageRolls: [6, 6, 6] }) as never)).rejects.toThrow(
        expect.objectContaining({ code: "invalid_target", message: "Забагато цілей для цього закляття" }),
      );
    });
  });
});
