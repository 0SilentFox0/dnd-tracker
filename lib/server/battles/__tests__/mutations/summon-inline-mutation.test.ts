import type { Spell } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { dismissExpiredSummons } from "@/lib/utils/battle/summon/dismiss";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 20, rows: 10, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position } });

const leaf = { kind: "dealDamage", amount: "1d4", damageType: "slashing", target: "eventTarget" };

const guard = {
  id: "guard", campaignId: "c1", name: "Синтетичний вартовий", level: 1, groupId: null, icon: null, dice: 0, cost: "action",
  targeting: { kind: "template", shape: "circle", size: 5, side: "enemy", maxTargets: 1, range: 60 }, resolution: { kind: "auto" }, raceModifiers: [],
  spellEffects: [
    { kind: "summonInline", name: "Кущ", size: "small", ac: "spellDc", hp: null, count: 1, upcastEvery: 2, duration: { rounds: 20 }, aura: { radiusFeet: 10, side: "enemies", onEnter: { attack: "spell", effects: [leaf] } } },
    { kind: "grantCast", label: "Листя", cost: "bonusAction", duration: { rounds: 20 }, cast: { targeting: { kind: "enemy" }, resolution: { kind: "attack" }, dice: 0, perObjectFeet: 10, effects: [leaf] } },
  ],
} as unknown as Spell;

const hero = () => {
  const base = at(participant("hero", { controlledBy: "user-1" }), { x: 0, y: 5 });

  return { ...base, abilities: { ...base.abilities, damageModel: "5e" as const, level: 5 }, spellcasting: { spellSlots: { "1": { max: 2, current: 2 }, "3": { max: 1, current: 1 } }, knownSpells: ["guard"], spellSaveDC: 13, spellAttackBonus: 5 } };
};

const gob = () => at(goblin, { x: 8, y: 5 });

const run = (body: Record<string, unknown>, ps: BattleParticipant[] = [hero(), gob()], round = 1) => {
  const ctx = context({ participants: ps, rng: () => 0.5, isDM: true, userId: "dm" });

  ctx.meta = { ...ctx.meta, map };
  ctx.scene.round = round;

  return createSpellMutation({ loadSpell: async () => guard, loadPool: async () => ({ units: [], races: [] }) })(ctx, { casterId: "hero", spellId: "guard", targetIds: [], diceRolls: [], targetCell: { x: 4, y: 5 }, ...body } as never);
};

const bushes = (ps: BattleParticipant[]) => ps.filter((p) => p.battleData.object);

describe("summonInline через spell-mutation", () => {
  it("кущ з'являється в обраній клітинці, СК стає КЗ, кастер отримує підкаст", async () => {
    const out = await run({});

    const [b] = bushes(out.participants);

    const caster = out.participants.find((p) => p.basicInfo.id === "hero") as BattleParticipant;

    expect(b.battleData.position).toEqual({ x: 4, y: 5 });
    expect(b.combatStats.armorClass).toBe(13);
    expect(b.battleData.object).toMatchObject({ spellId: "guard", expiresRound: 21 });
    expect(caster.spellcasting.grants?.[0]).toMatchObject({ label: "Листя", castCost: "bonusAction", inline: { perObjectFeet: 10 } });
  });

  it("слот 3-го кола дає ще один кущ", async () => {
    const out = await run({ slotKey: "3", castLevel: 3 });

    expect(bushes(out.participants)).toHaveLength(2);
  });

  it("бонусна атака без куща поруч із ціллю відхиляється, з кущем — проходить", async () => {
    const cast = await run({});

    const caster = cast.participants.find((p) => p.basicInfo.id === "hero") as BattleParticipant;

    const grantKey = caster.spellcasting.grants?.[0].key;

    await expect(run({ grantKey, targetIds: ["gob"], targetCell: undefined }, cast.participants.map((p) => (p.basicInfo.id === "gob" ? at(p, { x: 15, y: 5 }) : p)), 2)).rejects.toThrow(API_ERRORS.BATTLE_SPELL_NO_OBJECT_NEAR);

    const near = await run({ grantKey, targetIds: ["gob"], targetCell: undefined }, cast.participants.map((p) => (p.basicInfo.id === "gob" ? at(p, { x: 6, y: 5 }) : p)), 2);

    expect(near.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBeLessThan(goblin.combatStats.currentHp);
  });

  it("за межами тривалості кущ зникає", async () => {
    const out = await run({});

    expect(bushes(dismissExpiredSummons(out.participants, 22).participants)[0].battleData.dismissed).toBe(true);
  });
});
