import type { Prisma, Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import type { BattleParticipant } from "@/types/battle";

const row = {
  id: "s1",
  campaignId: "c1",
  name: "Синтетичний вибір",
  level: 0,
  groupId: null,
  icon: null,
  dice: 0,
  cost: "action",
  targeting: { kind: "enemy" },
  resolution: { kind: "auto" },
  spellEffects: [{ kind: "chooseOne", options: [{ kind: "heal", amount: 5, target: "self" }, { kind: "heal", amount: 9, target: "self" }] }],
  raceModifiers: [],
} as unknown as Spell;

const hero = () => participant("hero", { controlledBy: "user-1" }, { combatStats: { ...participant("x").combatStats, currentHp: 1, maxHp: 50 }, spellcasting: { spellSlots: {}, knownSpells: ["s1"] } });

const run = (body: Record<string, unknown>, ps: BattleParticipant[] = [hero(), goblin]) =>
  createSpellMutation({ loadSpell: vi.fn(async () => row), loadPool: async () => ({ units: [], races: [] as unknown as Prisma.RaceGetPayload<object>[] }) })(
    context({ participants: ps }),
    { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [], ...body } as never,
  );

describe("spell optionIndex", () => {
  it("is required when the spell has chooseOne", async () => {
    await expect(run({})).rejects.toMatchObject({ code: "action_rejected", message: API_ERRORS.BATTLE_SPELL_OPTION_REQUIRED });
  });

  it("an index past the options is rejected", async () => {
    await expect(run({ optionIndex: 2 })).rejects.toMatchObject({ message: API_ERRORS.BATTLE_SPELL_OPTION_REQUIRED });
  });

  it("only the chosen option applies", async () => {
    const out = await run({ optionIndex: 1 });

    expect(out.participants.find((p) => p.basicInfo.id === "hero")?.combatStats.currentHp).toBe(10);
  });
});
