import type { Prisma, Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { AttackType, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { attackBodySchema, attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { createSpellMutation, type SpellMutationDeps } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { diffTerrain } from "@/lib/utils/battle/grid/terrain";
import { BattleAccessError } from "@/lib/utils/battle/store";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

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

const aimOf = (out: { events: { details?: unknown }[] }) => (out.events[0].details as { actionDetails?: { aimCell?: unknown } } | undefined)?.actionDetails?.aimCell;

const hpOf = (out: { participants: BattleParticipant[] }, id: string) => out.participants.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

describe("spell mutation", () => {
  it("fixed monster cantrip accepts one d10 at level 17", async () => {
    const monster = { ...caster, abilities: { ...caster.abilities, level: 17, damageModel: "5e" as const } };

    const row = { ...spellRow, level: 0, dieSides: 10, fixedDice: true } as Spell;

    const out = await mutation(row)(context({ participants: [monster, goblin] }), body({ diceRolls: [7] }) as never);

    expect(hpOf(out, "gob")).toBe(goblin.combatStats.currentHp - 7);
  });

  it.each([false, true])("flat bonus appears once in preview and cast (heal=%s)", async (heal) => {
    const target = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 10, maxHp: 50 } };

    const row = { ...spellRow, dice: 2, damageBonus: 3, ...(heal && { targeting: { kind: "enemy" }, spellEffects: [{ kind: "heal", amount: { spellRoll: 100 } }] }) } as unknown as Spell;

    const ctx = context({ participants: [caster, target] });

    const out = await mutation(row)(ctx, body({ diceRolls: [2, 3] }) as never);

    const preview = await mutation(row)(ctx, body({ preview: true, diceRolls: [2, 3] }) as never);

    const action = preview.response?.battleAction as { hpChanges: unknown[] };

    expect(hpOf(out, "gob")).toBe(heal ? 18 : 2);
    expect(action.hpChanges).toEqual(out.events[0].hpChanges);
    expect(preview.participants).toBe(ctx.participants);
  });

  it("каст: сума кубиків, одна подія, слот витрачено", async () => {
    const out = await mutation()(context({ participants: [caster, goblin] }), body() as never);

    expect(out.events).toHaveLength(1);
    expect(hpOf(out, "gob")).toBe(goblin.combatStats.currentHp - 4);

    const slots = out.participants.find((p) => p.basicInfo.id === "hero")?.spellcasting.spellSlots;

    expect(slots?.["1"].current).toBe(1);
  });

  it("DM за героя витрачає слот і кастує лише відоме; вільний каст DM — без слота і будь-яке", async () => {
    const slotOf = (out: { participants: BattleParticipant[] }) => out.participants.find((p) => p.basicInfo.id === "hero")?.spellcasting.spellSlots["1"].current;

    const dm = () => context({ participants: [caster, goblin], isDM: true, userId: "dm" });

    expect(slotOf(await mutation()(dm(), body() as never))).toBe(1);
    expect(slotOf(await mutation()(dm(), body({ free: true }) as never))).toBe(2);

    const unknown = { ...caster, spellcasting: { ...caster.spellcasting, knownSpells: [] } };

    await expect(mutation()(context({ participants: [unknown, goblin], isDM: true, userId: "dm" }), body() as never)).rejects.toMatchObject({ code: "action_rejected" });
    expect(slotOf(await mutation()(context({ participants: [unknown, goblin], isDM: true, userId: "dm" }), body({ free: true }) as never))).toBe(2);
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

    it("diceRolls: шкода кубиками, рятунок введеного і докинутий сервером", async () => {
      const dm = context({ participants: [caster, goblin, gob2], isDM: true, userId: "dm", rng: () => 0.99 });

      const area = { ...save, targeting: { kind: "area", side: "enemy", maxTargets: 2 } } as unknown as Spell;

      const out = await mutation(area)(dm, body({ targetIds: ["gob", "gob2"], saveRolls: [{ participantId: "gob", roll: 7 }] }) as never);

      const rolls = (out.events[0].details as { actionDetails: { diceRolls: { kind: string; rollerId: string; dice: { sides: number; value: number; server?: boolean }[] }[] } }).actionDetails.diceRolls;

      expect(rolls.map((g) => g.kind)).toEqual(["damage", "save", "save"]);
      expect(rolls[0].dice).toEqual([{ sides: 6, value: 4 }]);
      expect(rolls[1]).toMatchObject({ rollerId: "gob", dice: [{ sides: 20, value: 7 }] });
      expect(rolls[1].dice[0].server).toBeUndefined();
      expect(rolls[2]).toMatchObject({ rollerId: "gob2", dice: [{ sides: 20, value: 20, server: true }] });
    });

    it("група кубиків: лікування за визначенням заклинання, а не за сумами", async () => {
      const healRow = { ...spellRow, targeting: { kind: "ally" }, spellEffects: [{ kind: "heal", amount: { spellRoll: 100 } }] } as unknown as Spell;

      const out = await mutation(healRow)(context({ participants: [caster, goblin] }), body({ targetIds: ["hero"] }) as never);

      const rolls = (out.events[0].details as { actionDetails: { diceRolls: { kind: string }[] } }).actionDetails.diceRolls;

      expect(rolls.map((g) => g.kind)).toEqual(["heal"]);
    });

    it("нецілий кидок відхиляє схема", async () => {
      const { spellSchema } = await import("@/lib/server/battles/mutations/spell/cast-spell-schema");

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

  describe("атака й закляття за дію ділять одну дію ходу", () => {
    const fighter = { ...caster, battleData: { ...caster.battleData, attacks: [{ id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" }] } };

    const tough = { ...goblin, combatStats: { ...goblin.combatStats, maxHp: 500, currentHp: 500 } };

    const strike = (participants: BattleParticipant[], over: Partial<Parameters<typeof context>[0]> = {}) =>
      attackMutation(context({ participants, ...over }), attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: 15, damageRolls: [5] }));

    const cast = (participants: BattleParticipant[], row: Spell = spellRow, over: Partial<Parameters<typeof context>[0]> = {}, extra: Record<string, unknown> = {}) =>
      mutation(row)(context({ participants, ...over }), body(extra) as never);

    it("атака → закляття за дію: 422 action_used", async () => {
      const after = await strike([fighter, tough]);

      await expect(cast(after.participants)).rejects.toMatchObject({ code: "action_used", message: API_ERRORS.ACTION_USED });
    });

    it("закляття за дію → атака: 422 action_used", async () => {
      const after = await cast([fighter, tough]);

      await expect(strike(after.participants)).rejects.toMatchObject({ code: "action_used", message: API_ERRORS.ACTION_USED });
    });

    it("атака → закляття за бонусну дію: дозволено", async () => {
      const after = await strike([fighter, tough]);

      const out = await cast(after.participants, { ...spellRow, cost: "bonusAction" } as Spell);

      expect(out.events).toHaveLength(1);
    });

    it("дві дії за хід (пул додаткових дій): і атака, і закляття", async () => {
      const twice = { ...fighter, battleData: { ...fighter.battleData, pendingExtraActions: 1 } };

      const after = await strike([twice, tough]);

      const out = await cast(after.participants);

      expect(out.events).toHaveLength(1);
      expect(out.participants.find((p) => p.basicInfo.id === "hero")?.actionFlags.hasUsedAction).toBe(true);
    });

    it("вільний каст DM після атаки дозволено і дію не витрачає", async () => {
      const after = await strike([fighter, tough]);

      const out = await cast(after.participants, spellRow, { isDM: true, userId: "dm" }, { free: true });

      expect(out.events).toHaveLength(1);
      await expect(cast(after.participants, spellRow, { isDM: true, userId: "dm" })).rejects.toMatchObject({ code: "action_used" });

      const fresh = await cast([fighter, tough], spellRow, { isDM: true, userId: "dm" }, { free: true });

      expect(fresh.participants.find((p) => p.basicInfo.id === "hero")?.actionFlags.hasUsedAction).toBe(false);
    });
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

  it("5e: важка броня без володіння блокує каст", async () => {
    const plate = { id: "plate", name: "Plate", slot: "armor", modifiers: [{ type: "armorCategory", value: "heavy" }, { type: "armorBase", value: "18" }] };

    const armored = {
      ...caster,
      abilities: { ...caster.abilities, damageModel: "5e" as const, proficiencies: { armor: [], weapons: ["Simple weapons"] } },
      battleData: { ...caster.battleData, equippedArtifacts: [plate as never] },
    };

    await expect(mutation()(context({ participants: [armored, goblin] }), body() as never)).rejects.toMatchObject({ code: "action_rejected", message: API_ERRORS.BATTLE_CASTER_ARMOR_NOT_PROFICIENT });
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

  describe("карта", () => {
    const map: BattleMapConfig = { cols: 20, rows: 20, background: null, opacity: 0.3 };

    const placed = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position } });

    const onMap = (over: Partial<Parameters<typeof context>[0]> = {}) => {
      const base = context({ participants: [placed(caster, { x: 2, y: 2 }), placed(goblin, { x: 5, y: 2 }), placed(gob2, { x: 15, y: 15 })] });

      return { ...base, meta: { ...base.meta, map }, ...over };
    };

    const withTargeting = (targeting: unknown, name = spellRow.name) => ({ ...spellRow, name, targeting }) as unknown as Spell;

    it("exact Fireball preview returns the same 49-cell disk used for casting", async () => {
      const row = withTargeting({ kind: "template", shape: "circle", size: 20, exact: true, side: "enemy", maxTargets: 3, range: 150 });

      const ctx = onMap({ participants: [placed(caster, { x: 2, y: 2 }), placed(goblin, { x: 10, y: 6 }), placed(gob2, { x: 9, y: 9 })] });

      const preview = await mutation(row)(ctx, body({ preview: true, targetCell: { x: 6, y: 6 } }) as never);

      const cast = await mutation(row)(ctx, body({ targetCell: { x: 6, y: 6 } }) as never);

      const cells = preview.response?.cells as string[];

      expect(hpOf(cast, "gob")).toBe(goblin.combatStats.currentHp - 4);
      expect(hpOf(cast, "gob2")).toBe(gob2.combatStats.currentHp);
      expect(cells).toHaveLength(49);
      expect(cells).toContain("10:6");
      expect(cells).not.toContain("9:9");
      expect((preview.response?.battleAction as { hpChanges: unknown[] }).hpChanges).toEqual(cast.events[0].hpChanges);
    });

    it("шаблон: цілі визначає сервер за точкою, обрані ігноруються", async () => {
      const row = withTargeting({ kind: "template", shape: "circle", size: 10, side: "enemy", maxTargets: 3, range: 30 });

      const out = await mutation(row)(onMap(), body({ targetIds: ["gob2"], targetCell: { x: 5, y: 2 } }) as never);

      expect(hpOf(out, "gob")).toBe(goblin.combatStats.currentHp - 4);
      expect(hpOf(out, "gob2")).toBe(gob2.combatStats.currentHp);
      expect(out.scene?.map).toBeUndefined();
    });

    it("шаблон на карті записує aimCell у подію, одиночне заклинання без точки — ні", async () => {
      const row = withTargeting({ kind: "template", shape: "circle", size: 10, side: "enemy", maxTargets: 3, range: 30 });

      const aimed = await mutation(row)(onMap(), body({ targetIds: [], targetCell: { x: 5, y: 2 } }) as never);

      expect(aimOf(aimed)).toEqual({ x: 5, y: 2 });

      const single = await mutation()(context({ participants: [caster, goblin] }), body() as never);

      expect(aimOf(single)).toBeUndefined();
    });

    it("шаблон у порожню зону: каст без цілей — слот витрачено, подія з aimCell, нікого не зачеплено", async () => {
      const row = withTargeting({ kind: "template", shape: "circle", size: 10, side: "enemy", maxTargets: 3, range: 60 });

      const out = await mutation(row)(onMap(), body({ targetIds: ["gob"], targetCell: { x: 9, y: 9 } }) as never);

      expect(out.events).toHaveLength(1);
      expect(aimOf(out)).toEqual({ x: 9, y: 9 });
      expect(hpOf(out, "gob")).toBe(goblin.combatStats.currentHp);
      expect(hpOf(out, "gob2")).toBe(gob2.combatStats.currentHp);
      expect(out.participants.find((p) => p.basicInfo.id === "hero")?.spellcasting.spellSlots["1"].current).toBe(1);
    });

    it("конус: aimCell — клітинка шаблону біля його центру, а не точка напрямку", async () => {
      const row = withTargeting({ kind: "template", shape: "cone", size: 15, side: "enemy", maxTargets: 3 });

      const out = await mutation(row)(onMap(), body({ targetIds: [], targetCell: { x: 19, y: 2 } }) as never);

      const aim = aimOf(out) as GridPoint | undefined;

      expect(aim).toBeDefined();
      expect(aim).not.toEqual({ x: 19, y: 2 });
      expect(aim?.x ?? 0).toBeGreaterThan(2);
      expect(aim?.x ?? 99).toBeLessThanOrEqual(5);
    });

    it("одиночне заклинання на карті з targetCell — без aimCell", async () => {
      const out = await mutation()(onMap(), body({ targetCell: { x: 5, y: 2 } }) as never);

      expect(aimOf(out)).toBeUndefined();
    });

    it("точка поза дальністю — invalid_target", async () => {
      const row = withTargeting({ kind: "template", shape: "circle", size: 10, side: "enemy", maxTargets: 3, range: 30 });

      await expect(mutation(row)(onMap(), body({ targetCell: { x: 15, y: 15 } }) as never)).rejects.toMatchObject({ code: "invalid_target" });
    });

    it("одиночна ціль поза дальністю — invalid_target", async () => {
      await expect(mutation(withTargeting({ kind: "enemy", range: 30 }))(onMap(), body({ targetIds: ["gob2"] }) as never)).rejects.toMatchObject({ code: "invalid_target" });
    });

    it("zone: клітинки лінії стають небезпекою зі строком і шкодою, дельта несе місцевість", async () => {
      const row = withTargeting({ kind: "template", shape: "line", size: 30, side: "enemy", maxTargets: 6, zone: { rounds: 2 } }, "Вогняна стіна");

      const ctx = onMap();

      const out = await mutation(row)({ ...ctx, scene: { ...ctx.scene, round: 3 } }, body({ targetIds: [], targetCell: { x: 2, y: 10 } }) as never);

      const terrain = out.scene?.map?.terrain ?? {};

      expect(Object.keys(terrain).sort()).toEqual(["2:3", "2:4", "2:5", "2:6", "2:7", "2:8"]);
      expect(terrain["2:5"]).toEqual({ kind: "hazard", label: "Вогняна стіна", untilRound: 4, damage: { amount: 4, type: "fire", spellId: "s1", casterId: "hero" } });
      expect(out.events).toHaveLength(1);
      expect(diffTerrain(map.terrain, out.scene?.map?.terrain)?.set?.[0].keys).toHaveLength(6);
    });

    it("точка за межами карти — invalid_target, навіть якщо коло зачепило б крайній стовпчик", async () => {
      const row = withTargeting({ kind: "template", shape: "circle", size: 10, side: "enemy", maxTargets: 3 });

      const ctx = onMap({ participants: [placed(caster, { x: 17, y: 2 }), placed(goblin, { x: 19, y: 2 })] });

      await expect(mutation(row)(ctx, body({ targetCell: { x: 20, y: 2 } }) as never)).rejects.toMatchObject({ code: "invalid_target" });
    });

    it("zone не перезаписує постійну небезпеку ДМ, а тимчасову — перезаписує", async () => {
      const row = withTargeting({ kind: "template", shape: "line", size: 30, side: "enemy", maxTargets: 6, zone: { rounds: 2 } }, "Вогняна стіна");

      const lava = { kind: "hazard" as const, label: "Лава", damage: { dice: "2d6", type: "fire" } };

      const old = { kind: "hazard" as const, label: "Старе", untilRound: 2, damage: { amount: 1, type: "acid" } };

      const ctx = onMap();

      const withTerrain = { ...ctx, meta: { ...ctx.meta, map: { ...map, terrain: { "2:4": lava, "2:5": old } } } };

      const out = await mutation(row)(withTerrain, body({ targetIds: [], targetCell: { x: 2, y: 10 } }) as never);

      const terrain = out.scene?.map?.terrain ?? {};

      expect(terrain["2:4"]).toEqual(lava);
      expect(terrain["2:5"]).toMatchObject({ label: "Вогняна стіна" });
    });

    it("zone з власним підписом; preview не ставить небезпеку, але повертає клітинки", async () => {
      const row = withTargeting({ kind: "template", shape: "line", size: 30, side: "enemy", maxTargets: 6, zone: { rounds: 1, label: "Полумʼя" } });

      const out = await mutation(row)(onMap(), body({ targetIds: [], targetCell: { x: 2, y: 10 } }) as never);

      expect(out.scene?.map?.terrain?.["2:3"]).toMatchObject({ label: "Полумʼя", untilRound: 1 });

      const preview = await mutation(row)(onMap(), body({ targetIds: [], targetCell: { x: 2, y: 10 }, preview: true, diceRolls: [] }) as never);

      expect(preview.scene).toBeUndefined();
      expect(preview.response).toMatchObject({ preview: true, cells: expect.arrayContaining(["2:3"]) });
    });
  });
});
