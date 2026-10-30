import type { Spell } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import type { BattleParticipant, IngredientStock } from "@/types/battle";

const diamond = { name: "Diamond", qty: 1, minGp: 50, consumed: true, focus: false };

const row = (over: Record<string, unknown> = {}) =>
  ({
    id: "s1", campaignId: "c1", name: "Revivify", level: 1, groupId: null, icon: null,
    dice: 1, dieSides: 6, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" },
    spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }], raceModifiers: [],
    ingredients: [diamond], ...over,
  }) as unknown as Spell;

const stockOf = (over: Partial<IngredientStock> = {}): IngredientStock => ({ items: [{ id: "i1", key: "diamond", name: "Diamond", worthGp: 50, qty: 1, used: 0 }], purseCp: 0, usedCp: 0, ...over });

const caster = (stock: IngredientStock | undefined, extra: Partial<BattleParticipant> = {}): BattleParticipant => {
  const base = participant("hero", { controlledBy: "user-1" });

  return { ...base, spellcasting: { spellSlots: { "1": { max: 2, current: 2 } }, knownSpells: ["s1"] }, battleData: { ...base.battleData, ...(stock && { ingredientStock: stock }) }, ...extra };
};

const rules = (enabled = true, autoPay = true) => ({ ...DEFAULT_RULES, spellIngredients: { enabled, autoPay } });

const cast = (c: BattleParticipant, o: { spell?: Spell; data?: Record<string, unknown>; enabled?: boolean; dm?: boolean; round?: number } = {}) => {
  const ctx = context({ participants: [c, goblin], rng: () => 0.5, ...(o.dm && { isDM: true, userId: "dm" }) });

  ctx.meta = { ...ctx.meta, rules: rules(o.enabled ?? true) };

  if (o.round) ctx.scene.round = o.round;

  return createSpellMutation({ loadSpell: async () => o.spell ?? row(), loadPool: async () => ({ units: [], races: [] }) })(ctx, { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [4], ...o.data } as never);
};

const heroOf = (out: { participants: BattleParticipant[] }) => out.participants.find((p) => p.basicInfo.id === "hero") as BattleParticipant;

describe("spell ingredients on cast", () => {
  it("rejects a missing ingredient with the list and leaves state untouched", async () => {
    const c = caster(stockOf({ items: [] }));

    await expect(cast(c)).rejects.toMatchObject({ code: "action_rejected", message: API_ERRORS.BATTLE_SPELL_INGREDIENTS_MISSING, params: { list: "Diamond ×1 (50 gp)" } });
    expect(c.spellcasting.spellSlots["1"].current).toBe(2);
    expect(c.actionFlags.hasUsedAction).toBe(false);
  });

  it("spends the item, the slot and logs it; a retry after refusal works", async () => {
    await expect(cast(caster(stockOf({ items: [] })))).rejects.toBeDefined();

    const out = await cast(caster(stockOf()));

    const hero = heroOf(out);

    expect(hero.battleData.ingredientStock?.items[0].used).toBe(1);
    expect(hero.spellcasting.spellSlots["1"].current).toBe(1);
    expect(JSON.stringify(out.events)).toContain("battleLog.spell.ingredientsSpent");
    expect(JSON.stringify(out.events)).toContain("Diamond ×1");
  });

  it("pays the missing gem from the purse", async () => {
    const out = await cast(caster(stockOf({ items: [], purseCp: 10_000 })));

    expect(heroOf(out).battleData.ingredientStock?.usedCp).toBe(5000);
  });

  it("does not auto-pay when autoPay is off", async () => {
    const c = caster(stockOf({ items: [], purseCp: 10_000 }));

    const ctx = context({ participants: [c, goblin], rng: () => 0.5 });

    ctx.meta = { ...ctx.meta, rules: rules(true, false) };
    await expect(createSpellMutation({ loadSpell: async () => row(), loadPool: async () => ({ units: [], races: [] }) })(ctx, { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [4] } as never)).rejects.toMatchObject({ message: API_ERRORS.BATTLE_SPELL_INGREDIENTS_MISSING });
  });

  it.each([
    ["DM free cast", { dm: true, data: { free: true } }],
    ["rule disabled", { enabled: false }],
  ])("%s skips the check", async (_n, o) => {
    const out = await cast(caster(stockOf({ items: [] })), o);

    expect(heroOf(out).battleData.ingredientStock?.items).toHaveLength(0);
    expect(heroOf(out).battleData.ingredientStock?.usedCp).toBe(0);
    expect(JSON.stringify(out.events)).not.toContain("ingredientsSpent");
  });

  it("a unit without stock casts normally", async () => {
    const out = await cast(caster(undefined));

    expect(out.events).toHaveLength(1);
    expect(JSON.stringify(out.events)).not.toContain("ingredientsSpent");
  });

  it("a granted cast skips the check", async () => {
    const base = caster(stockOf({ items: [] }));

    const granted = { ...base, spellcasting: { spellSlots: {}, knownSpells: [], grants: [{ spellId: "s1", key: "g" }] } } as BattleParticipant;

    const out = await cast(granted, { data: { grantKey: "g" } });

    expect(heroOf(out).battleData.ingredientStock?.items).toHaveLength(0);
  });

  it("preview does not spend", async () => {
    const out = await cast(caster(stockOf()), { data: { preview: true } });

    expect(out.response).toMatchObject({ preview: true });
    expect(heroOf(out).battleData.ingredientStock?.items[0].used).toBe(0);
  });

  it("a focus-only ingredient never blocks", async () => {
    const out = await cast(caster(stockOf({ items: [] })), { spell: row({ ingredients: [{ name: "Wand", qty: 1, consumed: false, focus: true }] }) });

    expect(out.events).toHaveLength(1);
  });

  it("a possessed non-consumed ingredient is never spent or paid for across casts", async () => {
    const kept = row({ ingredients: [{ ...diamond, consumed: false }] });

    let hero = caster(stockOf({ purseCp: 10_000 }), { spellcasting: { spellSlots: { "1": { max: 3, current: 3 } }, knownSpells: ["s1"] } });

    for (let i = 0; i < 3; i++) {
      hero = heroOf(await cast({ ...hero, actionFlags: { ...hero.actionFlags, hasUsedAction: false } }, { spell: kept }));
    }

    expect(hero.spellcasting.spellSlots["1"].current).toBe(0);
    expect(hero.battleData.ingredientStock?.items[0].used).toBe(0);
    expect(hero.battleData.ingredientStock?.usedCp).toBe(0);
  });

  it("a non-consumed ingredient without the item is rejected even with gold", async () => {
    const kept = row({ ingredients: [{ ...diamond, consumed: false }] });

    await expect(cast(caster(stockOf({ items: [], purseCp: 1_000_000 })), { spell: kept })).rejects.toMatchObject({ message: API_ERRORS.BATTLE_SPELL_INGREDIENTS_MISSING });
  });

  it("invalid stored ingredient entries do not disable the check for the valid ones", async () => {
    const spell = row({ ingredients: [diamond, { name: "" }] });

    await expect(cast(caster(stockOf({ items: [] })), { spell })).rejects.toMatchObject({ message: API_ERRORS.BATTLE_SPELL_INGREDIENTS_MISSING });
  });

  it("long cast: beginning only checks, completion spends", async () => {
    const spell = row({ cost: "long", casting: { rounds: 2, text: "2 rounds" } });

    const free = (p: BattleParticipant) => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedAction: false } });

    await expect(cast(caster(stockOf({ items: [] })), { spell })).rejects.toMatchObject({ message: API_ERRORS.BATTLE_SPELL_INGREDIENTS_MISSING });

    const begun = heroOf(await cast(caster(stockOf()), { spell, round: 1 }));

    expect(begun.battleData.pendingCast).toBeDefined();
    expect(begun.battleData.ingredientStock?.items[0].used).toBe(0);

    const done = await cast(free(begun), { spell, round: 2 });

    expect(heroOf(done).battleData.ingredientStock?.items[0].used).toBe(1);
  });
});
