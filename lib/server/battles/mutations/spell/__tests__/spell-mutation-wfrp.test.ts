import type { Prisma, Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { castSpellSchema } from "@/lib/schemas/battles";
import { context, goblin, participant } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { wfrpAbilitiesOf } from "@/lib/utils/rules/systems/wfrp/combat/participant";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
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

const details = (out: { events: { details?: unknown }[] }) => (out.events[0].details as { actionDetails: { percentileCast?: { roll: number; outcome: string } }; lines?: unknown }).actionDetails;

const hp = (out: { participants: BattleParticipant[] }, id: string) => out.participants.find((p) => p.basicInfo.id === id)?.combatStats.currentHp as number;

describe("castSpellSchema, percentile fields", () => {
  const base = { casterId: "hero", spellId: "s1" };

  it("rejects castRoll above 100", () => {
    expect(castSpellSchema.safeParse({ ...base, castRoll: 101 }).success).toBe(false);
    expect(castSpellSchema.safeParse({ ...base, castRoll: 100 }).success).toBe(true);
  });

  it("rejects a fortune on a free cast", () => {
    expect(castSpellSchema.safeParse({ ...base, free: true, fortune: "sl" }).success).toBe(false);
    expect(castSpellSchema.safeParse({ ...base, fortune: "sl" }).success).toBe(true);
  });
});

describe("spell mutation in WFRP", () => {
  it("a passed test applies the spell and records the cast", async () => {
    const out = await run(bolt, { castRoll: 30 });

    expect(details(out).percentileCast).toMatchObject({ roll: 30, outcome: "success" });
    expect(hp(out, "gob")).toBeLessThan(goblin.combatStats.currentHp);
  });

  it("serverRoll ignores castRoll", async () => {
    const out = await run(bolt, { castRoll: 30, serverRoll: true });

    expect(details(out).percentileCast).toBeDefined();
  });

  it("a failed test answers with an event and no damage", async () => {
    const out = await run(bolt, { castRoll: 60 });

    expect(details(out).percentileCast?.outcome).toBe("failure");
    expect(out.events).toHaveLength(1);
    expect(hp(out, "gob")).toBe(goblin.combatStats.currentHp);
    expect(out.participants.find((p) => p.basicInfo.id === "hero")?.actionFlags.hasUsedAction).toBe(true);
  });

  it("a preview rolls nothing", async () => {
    const out = await run(bolt, { castRoll: 60, preview: true });

    expect(out.events).toEqual([]);
    expect(JSON.stringify(out.response)).not.toContain("percentileCast");
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

  it("Fortune reroll with a point is spent", async () => {
    const out = await run(bolt, { castRoll: 90, fortune: "reroll", fortuneRoll: 30 }, { c: caster(1) });

    expect(details(out).percentileCast?.outcome).toBe("success");
    expect(out.participants.find((p) => p.basicInfo.id === "hero")?.battleData.fortune).toBe(0);
  });
});

describe("spell mutation in d20", () => {
  it("ignores the percentile fields and still needs a slot", async () => {
    await expect(run(bolt, { castRoll: 30 }, { wfrp: false })).rejects.toMatchObject({ message: "errors.battleNoFreeSlot" });
  });
});
