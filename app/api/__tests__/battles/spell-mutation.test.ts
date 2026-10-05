import type { Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { createSpellMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
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
});
