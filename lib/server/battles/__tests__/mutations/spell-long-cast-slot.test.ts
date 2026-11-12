import type { Spell } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import type { BattleParticipant } from "@/types/battle";

const spell = {
  id: "s1", campaignId: "c1", name: "Ritual", level: 1, groupId: null, icon: null,
  dice: 1, dieSides: 6, cost: "long", casting: { rounds: 2, text: "2 rounds" }, targeting: { kind: "enemy" }, resolution: { kind: "auto" },
  spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }], raceModifiers: [],
} as unknown as Spell;

const caster = (damageModel: string): BattleParticipant => {
  const base = participant("hero", { controlledBy: "user-1" });

  return { ...base, abilities: { ...base.abilities, damageModel } as never, spellcasting: { spellSlots: { "1": { max: 2, current: 2 } }, knownSpells: ["s1"] } };
};

const begin = (c: BattleParticipant) => {
  const ctx = context({ participants: [c, goblin], rng: () => 0.5 });

  ctx.scene.round = 1;

  return createSpellMutation({ loadSpell: async () => spell, loadPool: async () => ({ units: [], races: [] }) })(ctx, { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [4], slotKey: "9" } as never);
};

describe("beginLongCast slot check", () => {
  it("a caster that does not pick slots ignores a stale slotKey and falls back to the default slot", async () => {
    const out = await begin(caster("d6"));

    expect(out.participants.find((p) => p.basicInfo.id === "hero")?.battleData.pendingCast).toBeDefined();
  });

  it("a slot-picking caster still gets the error for a missing circle", async () => {
    await expect(begin(caster("5e"))).rejects.toMatchObject({ message: API_ERRORS.SLOT_MISSING });
  });
});
