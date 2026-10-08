import type { Prisma, Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { createSpellMutation, type SpellMutationDeps } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { BattleAccessError } from "@/lib/utils/battle/store";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import type { BattleParticipant } from "@/types/battle";

const spellRow = {
  id: "s1",
  campaignId: "c1",
  name: "Вогняна стріла",
  level: 1,
  groupId: null,
  icon: null,
  dice: 1,
  cost: "action",
  targeting: { kind: "enemy" },
  resolution: { kind: "auto" },
  spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }],
  raceModifiers: [],
} as unknown as Spell;

const caster = participant("hero", { controlledBy: "user-1" }, {
  spellcasting: { spellSlots: { "1": { max: 2, current: 2 } }, knownSpells: ["s1"] },
});

const gob2 = participant("gob2", { side: ParticipantSide.ENEMY, controlledBy: "dm", name: "Гоблін 2" });

const unit = (id: string) =>
  ({
    id, campaignId: "c1", name: "Звір", raceId: "r1", level: 1, strength: 14, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
    armorClass: 13, initiative: 2, speed: 30, maxHp: 30, proficiencyBonus: 2, attacks: [], knownSpells: [], avatar: null, createdAt: new Date(), immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [],
  }) as unknown as UnitFromPrisma;

function mutation(row: Spell | null = spellRow, deps: Partial<SpellMutationDeps> = {}) {
  return createSpellMutation({
    loadSpell: vi.fn(async () => row),
    loadPool: async () => ({ units: [unit("u-wolf")], races: [{ id: "r1", campaignId: "c1", name: "Звірі", abilities: [] }] as unknown as Prisma.RaceGetPayload<object>[] }),
    ...deps,
  });
}

const body = (over: Record<string, unknown> = {}) => ({ casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [4], ...over });

const hpOf = (out: { participants: BattleParticipant[] }, id: string) => out.participants.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

describe("spell mutation", () => {
  it("каст: сума кубиків, одна подія, слот витрачено", async () => {
    const out = await mutation()(context({ participants: [caster, goblin] }), body() as never);

    expect(out.events).toHaveLength(1);
    expect(hpOf(out, "gob")).toBe(goblin.combatStats.currentHp - 4);

    const slots = out.participants.find((p) => p.basicInfo.id === "hero")?.spellcasting.spellSlots;

    expect(slots?.["1"].current).toBe(1);
  });

  it("без вільного слота — 422 і нічого не зберігається", async () => {
    const empty = { ...caster, spellcasting: { ...caster.spellcasting, spellSlots: { "1": { max: 2, current: 0 } } } };

    await expect(mutation()(context({ participants: [empty, goblin] }), body() as never)).rejects.toMatchObject({ code: "action_rejected" });
  });

  describe("рятівні кидки з клієнта", () => {
    const save = { ...spellRow, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" } } as unknown as Spell;

    const saveBody = (roll: number) => body({ saveRolls: [{ participantId: "gob", roll }] });

    const dealt = (out: { participants: BattleParticipant[] }) => goblin.combatStats.currentHp - (hpOf(out, "gob") as number);

    it("гравець не може підкинути збереження чужій цілі: кидає сервер і це видно в лозі", async () => {
      const out = await mutation(save)(context({ participants: [caster, goblin], rng: () => 0.99 }), saveBody(1) as never);

      expect(dealt(out)).toBe(2);
      expect(out.events[0].resultText).toContain("рятівні кидки кинув сервер");
    });

    it("без клієнтських кидків нотатки про сервер немає", async () => {
      const out = await mutation(save)(context({ participants: [caster, goblin], rng: () => 0.99 }), body() as never);

      expect(out.events[0].resultText).not.toContain("кинув сервер");
    });

    it("DM може передати кидок цілі", async () => {
      const out = await mutation(save)(context({ participants: [caster, goblin], isDM: true, userId: "dm", rng: () => 0.99 }), saveBody(1) as never);

      expect(dealt(out)).toBe(4);
    });

    it("нецілий кидок відхиляє схема", async () => {
      const { spellSchema } = await import("@/app/api/campaigns/[id]/battles/[battleId]/spell/cast-spell-schema");

      expect(spellSchema.safeParse(saveBody(10.5)).success).toBe(false);
    });
  });

  it("preview: учасники не змінюються, у response — battleAction", async () => {
    const ctx = context({ participants: [caster, goblin] });

    const out = await mutation()(ctx, body({ preview: true, diceRolls: [] }) as never);

    expect(out.participants).toBe(ctx.participants);
    expect(out.events).toEqual([]);
    expect(out.response).toMatchObject({ preview: true });
    expect(out.response?.battleAction).toBeDefined();
  });

  it("кастера немає — 404; не свій хід — 403", async () => {
    await expect(mutation()(context(), body({ casterId: "nobody" }) as never)).rejects.toMatchObject({ status: 404 });
    await expect(mutation()(context({ participants: [goblin, caster] }), body() as never)).rejects.toBeInstanceOf(BattleAccessError);
  });

  it("непритомний кастер — participant_dead", async () => {
    const downed = { ...caster, combatStats: { ...caster.combatStats, status: "unconscious" as const } };

    await expect(mutation()(context({ participants: [downed, goblin] }), body() as never)).rejects.toMatchObject({ code: "participant_dead" });
  });

  it("невідомий спел для гравця — action_rejected; спел іншої кампанії — 404", async () => {
    await expect(mutation()(context({ participants: [hero, goblin] }), body() as never)).rejects.toMatchObject({ code: "action_rejected" });
    await expect(mutation({ ...spellRow, campaignId: "other" } as Spell)(context({ participants: [caster, goblin] }), body() as never)).rejects.toMatchObject({ status: 404 });
  });

  it("дія вже використана — action_used", async () => {
    const used = { ...caster, actionFlags: { ...caster.actionFlags, hasUsedAction: true } };

    await expect(mutation()(context({ participants: [used, goblin] }), body() as never)).rejects.toMatchObject({ code: "action_used" });
  });

  it("бонусна дія: витрачає бонусну, а не основну", async () => {
    const out = await mutation({ ...spellRow, cost: "bonusAction" } as Spell)(context({ participants: [caster, goblin] }), body() as never);

    const flags = out.participants.find((p) => p.basicInfo.id === "hero")?.actionFlags;

    expect(flags).toMatchObject({ hasUsedBonusAction: true, hasUsedAction: false });
  });

  it("кубики мають збігатися з формулою: кількість і грані — invalid_dice", async () => {
    const run = (diceRolls: number[]) => mutation()(context({ participants: [caster, goblin] }), body({ diceRolls }) as never);

    await expect(run([])).rejects.toMatchObject({ code: "invalid_dice" });
    await expect(run([3, 3])).rejects.toMatchObject({ code: "invalid_dice" });
    await expect(run([7])).rejects.toMatchObject({ code: "invalid_dice" });
    await expect(run([6])).resolves.toBeDefined();
  });

  it("кубики масштабуються рівнем героя і майстерністю школи", async () => {
    const mage = { ...caster, abilities: { ...caster.abilities, level: 6 }, battleData: { ...caster.battleData, schoolMastery: { fire: "expert" as const } } };

    const m = mutation({ ...spellRow, groupId: "fire", dice: 4 } as Spell);

    await expect(m(context({ participants: [mage, goblin] }), body({ diceRolls: [10, 10, 10, 10, 10, 10] }) as never)).resolves.toBeDefined();
    await expect(m(context({ participants: [mage, goblin] }), body({ diceRolls: [10, 10, 10, 10] }) as never)).rejects.toMatchObject({ code: "invalid_dice" });
  });

  it("кастер у паніці — action_used", async () => {
    const panic = { participantId: "hero", d10Roll: 1, moraleResult: { shouldSkipTurn: true, hasExtraTurn: false, moralePositive: false, message: "" } };

    const ctx = context({ participants: [caster, goblin] });

    await expect(mutation()({ ...ctx, scene: { ...ctx.scene, pendingMoraleCheck: panic } }, body() as never)).rejects.toMatchObject({ code: "action_used" });
  });

  it("заборона заклинань блокує каст", async () => {
    const blinded = {
      ...caster,
      battleData: { ...caster.battleData, activeEffects: [{ id: "b", name: "Сліпота", type: "condition" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [{ type: "disable_spell_casting", value: 1 }] }] },
    };

    await expect(mutation()(context({ participants: [blinded, goblin] }), body() as never)).rejects.toMatchObject({ code: "action_rejected" });
  });

  it("неправильна ціль — invalid_target", async () => {
    await expect(mutation()(context({ participants: [caster, goblin] }), body({ targetIds: ["hero"] }) as never)).rejects.toMatchObject({ code: "invalid_target" });
    await expect(mutation()(context({ participants: [caster, goblin] }), body({ targetIds: [] }) as never)).rejects.toMatchObject({ code: "invalid_target" });
  });

  it("призив за unitId: юніт на боці кастера під контролем його гравця", async () => {
    const row = { ...spellRow, spellEffects: [{ kind: "summon", unitId: "u-wolf" }], dice: 0, targeting: { kind: "self" } } as unknown as Spell;

    const out = await mutation(row)(context({ participants: [caster, goblin] }), body({ targetIds: [], diceRolls: [] }) as never);

    const wolf = out.participants.find((p) => p.basicInfo.sourceId === "u-wolf") as BattleParticipant;

    expect(wolf.basicInfo).toMatchObject({ side: caster.basicInfo.side, controlledBy: "user-1", sourceType: ParticipantSourceType.UNIT });
    expect(wolf.battleData.summonedBy).toBe("hero");
  });

  describe("spellTargeting зі скілів", () => {
    const withFlag = (mode: "area" | "all", extra: Partial<{ maxTargets: number }> = {}) => ({
      ...caster,
      battleData: { ...caster.battleData, resolvedAbilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellTargeting", mode, ...extra }] })] },
    });

    it("all розширює цілі заклинання на всю сторону", async () => {
      const out = await mutation()(context({ participants: [withFlag("all"), goblin, gob2] }), body() as never);

      expect(hpOf(out, "gob2")).toBeLessThan(gob2.combatStats.currentHp);
    });

    it("більше цілей, ніж дозволяє область — invalid_target", async () => {
      const gob3 = participant("gob3", { side: ParticipantSide.ENEMY });

      const ctx = context({ participants: [withFlag("area", { maxTargets: 2 }), goblin, gob2, gob3] });

      await expect(mutation()(ctx, body({ targetIds: ["gob", "gob2", "gob3"] }) as never)).rejects.toMatchObject({ code: "invalid_target" });
    });
  });
});

