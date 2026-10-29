import type { Prisma, Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { castSpellSchema as spellSchema } from "@/lib/schemas/battles";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import type { BattleParticipant } from "@/types/battle";

const plummet = {
  id: "s1",
  campaignId: "c1",
  name: "Синтетичне падіння",
  level: 1,
  groupId: null,
  icon: null,
  dice: 1,
  dieSides: 6,
  fixedDice: true,
  cost: "action",
  targeting: { kind: "enemy" },
  resolution: { kind: "auto" },
  spellEffects: [{ kind: "inputDice", label: "Висота", max: 20 }, { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "bludgeoning" }],
  raceModifiers: [],
} as unknown as Spell;

const hero = () => participant("hero", { controlledBy: "user-1" }, { spellcasting: { spellSlots: { "1": { max: 2, current: 2 } }, knownSpells: ["s1"] }, abilities: { ...participant("x").abilities, damageModel: "5e" as const, level: 3 } });

const run = (body: Record<string, unknown>, ps: BattleParticipant[] = [hero(), goblin]) =>
  createSpellMutation({ loadSpell: vi.fn(async () => plummet), loadPool: async () => ({ units: [], races: [] as unknown as Prisma.RaceGetPayload<object>[] }) })(
    context({ participants: ps }),
    { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [], ...body } as never,
  );

describe("spell inputCount", () => {
  it("is required for a spell with inputDice", async () => {
    await expect(run({ diceRolls: [3] })).rejects.toMatchObject({ code: "action_rejected", message: API_ERRORS.BATTLE_SPELL_INPUT_REQUIRED });
  });

  it("the roll count follows inputCount", async () => {
    await expect(run({ inputCount: 3, diceRolls: [3, 3] })).rejects.toMatchObject({ code: "invalid_dice" });

    const out = await run({ inputCount: 3, diceRolls: [2, 3, 4] });

    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBe(goblin.combatStats.currentHp - 9);
  });

  it("is clamped to the spell max (25 -> 20 dice)", async () => {
    await expect(run({ inputCount: 25, diceRolls: Array(25).fill(1) })).rejects.toMatchObject({ code: "invalid_dice" });

    const out = await run({ inputCount: 25, diceRolls: Array(20).fill(1) });

    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBe(Math.max(0, goblin.combatStats.currentHp - 20));
  });

  it("the request schema bounds the field", () => {
    expect(spellSchema.safeParse({ casterId: "a", spellId: "b", inputCount: 41 }).success).toBe(false);
    expect(spellSchema.safeParse({ casterId: "a", spellId: "b", inputCount: 12 }).success).toBe(true);
  });
});
