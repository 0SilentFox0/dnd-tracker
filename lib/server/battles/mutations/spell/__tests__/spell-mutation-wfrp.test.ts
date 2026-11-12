import type { Prisma, Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { castSpellSchema } from "@/lib/schemas/battles";
import { context, goblin, participant } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { SystemSlot } from "@/lib/utils/rules/systems/slot";
import { castOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleParticipant } from "@/types/battle";

const magic = { cn: 2, kind: "arcane", overcast: null };

const bolt = {
  id: "s1",
  campaignId: "c1",
  name: "Bolt",
  level: 1,
  groupId: null,
  icon: null,
  dice: 0,
  dieSides: null,
  upcastDice: null,
  upcastTargets: null,
  cost: "action",
  casting: { magic },
  targeting: { kind: "enemy" },
  resolution: { kind: "auto" },
  spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire", byDistance: [{ maxFeet: 10, dice: "1d6" }, { maxFeet: 120, dice: "1d6" }] }],
  raceModifiers: [],
} as unknown as Spell;

const caster = (fortune = 0): BattleParticipant => {
  const p = participant("hero", { controlledBy: "user-1" });

  const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, int: 40 }, skillAdvances: { "language:magick": 10 } };

  return { ...p, abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics) }, battleData: { ...p.battleData, fortune }, spellcasting: { ...p.spellcasting, spellSlots: {}, knownSpells: ["s1"] } };
};

const run = (row: Spell, body: Record<string, unknown>, opts: { wfrp?: boolean; c?: BattleParticipant } = {}) => {
  const c = opts.c ?? caster();

  const ctx = context({ participants: [c, goblin] });

  return createSpellMutation({ loadSpell: vi.fn(async () => row), loadPool: async () => ({ units: [], races: [] as unknown as Prisma.RaceGetPayload<object>[] }) })(
    { ...ctx, meta: { ...ctx.meta, rules: opts.wfrp === false ? DEFAULT_RULES : WFRP_RULES } },
    { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [], ...body } as never,
  );
};

const details = (out: { events: { details?: unknown }[] }) => (out.events[0].details as { actionDetails: { system?: SystemSlot } }).actionDetails;

const hp = (out: { participants: BattleParticipant[] }, id: string) => out.participants.find((p) => p.basicInfo.id === id)?.combatStats.currentHp as number;

describe("castSpellSchema, percentile fields", () => {
  const base = { casterId: "hero", spellId: "s1" };

  it("rejects castRoll above 100", () => {
    expect(castSpellSchema.safeParse({ ...base, castRoll: 101 }).success).toBe(false);
    expect(castSpellSchema.safeParse({ ...base, castRoll: 100 }).success).toBe(true);
  });

  it("accepts both request shapes of a fortune", () => {
    expect(castSpellSchema.safeParse({ ...base, fortune: "sl" }).success).toBe(true);
    expect(castSpellSchema.safeParse({ ...base, system: { key: "wfrp", data: { kind: "sl" } } }).success).toBe(true);
  });
});

describe("spell mutation in WFRP", () => {
  it("a passed test applies the spell and records the cast", async () => {
    const out = await run(bolt, { castRoll: 30 });

    expect(castOf(details(out))).toMatchObject({ roll: 30, outcome: "success" });
    expect(hp(out, "gob")).toBeLessThan(goblin.combatStats.currentHp);
  });

  it("serverRoll ignores castRoll", async () => {
    const out = await run(bolt, { castRoll: 30, serverRoll: true });

    expect(castOf(details(out))).toBeDefined();
  });

  it("a failed test answers with an event and no damage", async () => {
    const out = await run(bolt, { castRoll: 60 });

    expect(castOf(details(out))?.outcome).toBe("failure");
    expect(out.events).toHaveLength(1);
    expect(hp(out, "gob")).toBe(goblin.combatStats.currentHp);
    expect(out.participants.find((p) => p.basicInfo.id === "hero")?.actionFlags.hasUsedAction).toBe(true);
  });

  it("a preview rolls nothing", async () => {
    const out = await run(bolt, { castRoll: 60, preview: true });

    expect(out.events).toEqual([]);
    expect(JSON.stringify(out.response)).not.toContain("\"cast\"");
  });

  it("a save spell is a system mismatch", async () => {
    await expect(run({ ...bolt, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" } } as unknown as Spell, { castRoll: 30 })).rejects.toMatchObject({ code: "action_rejected", message: "errors.battleSpellSystemMismatch" });
  });

  it("a spell without magic data is a system mismatch", async () => {
    await expect(run({ ...bolt, casting: null } as unknown as Spell, { castRoll: 30 })).rejects.toMatchObject({ message: "errors.battleSpellSystemMismatch" });
  });

  it("a long cast is out of scope", async () => {
    await expect(run({ ...bolt, cost: "long" } as unknown as Spell, { castRoll: 30, castingRounds: 2 })).rejects.toMatchObject({ message: "errors.battleSpellSystemMismatch" });
  });

  it("Fortune needs a point", async () => {
    await expect(run(bolt, { castRoll: 90, fortune: "reroll" })).rejects.toMatchObject({ message: "errors.noFortune" });
  });

  it("rejects a fortune on a free cast", async () => {
    await expect(run(bolt, { castRoll: 90, free: true, fortune: "sl" }, { c: caster(2) })).rejects.toMatchObject({ message: "battleLog.reject.fortuneNotFree" });
  });

  it("the new request shape spends Fortune like the old one", async () => {
    const out = await run(bolt, { castRoll: 90, system: { key: "wfrp", data: { kind: "reroll" } }, secondRoll: 30 }, { c: caster(1) });

    expect(castOf(details(out))?.outcome).toBe("success");
    expect(out.participants.find((p) => p.basicInfo.id === "hero")?.battleData.fortune).toBe(0);
  });

  it("Fortune reroll with a point is spent", async () => {
    const out = await run(bolt, { castRoll: 90, fortune: "reroll", fortuneRoll: 30 }, { c: caster(1) });

    expect(castOf(details(out))?.outcome).toBe("success");
    expect(out.participants.find((p) => p.basicInfo.id === "hero")?.battleData.fortune).toBe(0);
  });
});

describe("spell mutation in WFRP, fizzle with Fortune", () => {
  it("spends Fortune exactly once", async () => {
    const out = await run(bolt, { castRoll: 90, fortune: "reroll", fortuneRoll: 80 }, { c: caster(2) });

    expect(castOf(details(out))?.outcome).toBe("failure");
    expect(hp(out, "gob")).toBe(goblin.combatStats.currentHp);
    expect(out.participants.find((p) => p.basicInfo.id === "hero")?.battleData.fortune).toBe(1);
  });
});

describe("spell mutation in d20", () => {
  it("ignores the percentile fields and still needs a slot", async () => {
    await expect(run(bolt, { castRoll: 30 }, { wfrp: false })).rejects.toMatchObject({ message: "errors.battleNoFreeSlot" });
  });
});

describe("spell mutation in WFRP, ingredients", () => {
  const withIngredient = { ...bolt, ingredients: [{ name: "Diamond", qty: 1, minGp: 50, consumed: true, focus: false }] } as unknown as Spell;

  const stocked = (items = 1) => {
    const c = caster();

    return { ...c, battleData: { ...c.battleData, ingredientStock: { items: items ? [{ id: "i1", key: "diamond", name: "Diamond", worthGp: 50, qty: items, used: 0 }] : [], purseCp: 0, usedCp: 0 } } };
  };

  const rules = { ...WFRP_RULES, spellIngredients: { enabled: true, autoPay: false } };

  const cast = (body: Record<string, unknown>, c: BattleParticipant) => {
    const ctx = context({ participants: [c, goblin] });

    return createSpellMutation({ loadSpell: vi.fn(async () => withIngredient), loadPool: async () => ({ units: [], races: [] as unknown as Prisma.RaceGetPayload<object>[] }) })({ ...ctx, meta: { ...ctx.meta, rules } }, { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [], ...body } as never);
  };

  const stockOf = (out: { participants: BattleParticipant[] }) => out.participants.find((p) => p.basicInfo.id === "hero")?.battleData.ingredientStock;

  it("schema accepts useIngredient: true only", () => {
    expect(castSpellSchema.safeParse({ casterId: "h", spellId: "s", useIngredient: true }).success).toBe(true);
    expect(castSpellSchema.safeParse({ casterId: "h", spellId: "s", useIngredient: false }).success).toBe(false);
  });

  it("casts without an ingredient, even with an empty stock", async () => {
    const out = await cast({ castRoll: 30 }, stocked(0));

    expect(castOf(details(out))?.outcome).toBe("success");
    expect(stockOf(out)?.items).toHaveLength(0);
  });

  it("useIngredient spends the item and cancels a miscast", async () => {
    const out = await cast({ castRoll: 77, useIngredient: true }, stocked());

    expect(stockOf(out)?.items[0].used).toBe(1);
    expect(castOf(details(out))?.miscast).toBeNull();
    expect(JSON.stringify(out.events)).toContain("wfrpMagic.log.ingredientAverts");
  });

  it("the same doubles without it miscasts", async () => {
    const out = await cast({ castRoll: 77 }, stocked());

    expect(castOf(details(out))?.miscast).toBe("minor");
  });

  it("the ingredient is spent even when nothing needed averting", async () => {
    const out = await cast({ castRoll: 30, useIngredient: true }, stocked());

    expect(stockOf(out)?.items[0].used).toBe(1);
    expect(JSON.stringify(out.events)).not.toContain("ingredientAverts");
  });

  it("useIngredient without stock is refused", async () => {
    await expect(cast({ castRoll: 30, useIngredient: true }, stocked(0))).rejects.toMatchObject({ message: API_ERRORS.BATTLE_SPELL_INGREDIENTS_MISSING });
  });
});
