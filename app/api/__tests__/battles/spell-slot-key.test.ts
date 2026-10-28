import type { Prisma, Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { createSpellMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { ParticipantSide } from "@/lib/constants/battle";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";
import type { BattleParticipant } from "@/types/battle";

const fireball = {
  id: "s1",
  campaignId: "c1",
  name: "Вогняна куля",
  level: 3,
  groupId: null,
  icon: null,
  dice: 8,
  dieSides: 6,
  upcastDice: 1,
  upcastTargets: 1,
  cost: "action",
  targeting: { kind: "enemy" },
  resolution: { kind: "auto" },
  spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }],
  raceModifiers: [],
} as unknown as Spell;

const slots = { "3": { max: 2, current: 2 }, "5": { max: 1, current: 1 }, pact: { level: 4, max: 1, current: 1 } };

const caster = (fiveE: boolean) =>
  participant("hero", { controlledBy: "user-1" }, { spellcasting: { spellSlots: slots, knownSpells: ["s1"] }, ...(fiveE && { abilities: { ...participant("x").abilities, damageModel: "5e" as const, level: 9 } }) });

const run = (row: Spell, c: BattleParticipant, body: Record<string, unknown>, ps: BattleParticipant[] = [c, goblin]) =>
  createSpellMutation({ loadSpell: vi.fn(async () => row), loadPool: async () => ({ units: [], races: [] as unknown as Prisma.RaceGetPayload<object>[] }) })(
    context({ participants: ps }),
    { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [], ...body } as never,
  );

const slotsOf = (out: { participants: BattleParticipant[] }) => out.participants.find((p) => p.basicInfo.id === "hero")?.spellcasting.spellSlots;

const detailsOf = (out: { events: { details?: unknown }[] }) => (out.events[0].details as { actionDetails: { spellSlotUsed?: number; castLevel?: number } }).actionDetails;

describe("spell slotKey", () => {
  it("5e upcast: slot 5 gives 10 dice and spends slot 5", async () => {
    const out = await run(fireball, caster(true), { slotKey: "5", diceRolls: Array(10).fill(3) });

    expect(slotsOf(out)?.["5"].current).toBe(0);
    expect(slotsOf(out)?.["3"].current).toBe(2);
    expect(detailsOf(out)).toMatchObject({ spellSlotUsed: 5, castLevel: 5 });
  });

  it("5e upcast: nine dice are rejected", async () => {
    await expect(run(fireball, caster(true), { slotKey: "5", diceRolls: Array(9).fill(3) })).rejects.toMatchObject({ code: "invalid_dice" });
  });

  it("pact slot is spent at pact level", async () => {
    const out = await run(fireball, caster(true), { slotKey: "pact", diceRolls: Array(9).fill(3) });

    expect(slotsOf(out)?.pact.current).toBe(0);
    expect(detailsOf(out).spellSlotUsed).toBe(4);
  });

  it("HOMM hero ignores slotKey: auto pick, no castLevel", async () => {
    const bolt = { ...fireball, dice: 1, dieSides: null, upcastDice: null } as unknown as Spell;

    const hero = caster(false);

    const dice = casterSpellDice(hero, { dice: 1, groupId: null });

    const out = await run(bolt, hero, { slotKey: "5", diceRolls: Array(dice.count).fill(2) });

    expect(slotsOf(out)?.["5"].current).toBe(1);
    expect(slotsOf(out)?.["3"].current).toBe(1);
    expect(detailsOf(out)).toMatchObject({ spellSlotUsed: 3 });
    expect(detailsOf(out).castLevel).toBeUndefined();
  });

  it("a lower slot gives 422", async () => {
    await expect(run({ ...fireball, level: 5 } as Spell, caster(true), { slotKey: "3" })).rejects.toMatchObject({ code: "action_rejected" });
  });

  it("a missing slot gives 422", async () => {
    await expect(run(fireball, caster(true), { slotKey: "4" })).rejects.toMatchObject({ code: "action_rejected" });
  });

  it("an empty slot gives 422", async () => {
    const hero = caster(true);

    const empty = { ...hero, spellcasting: { ...hero.spellcasting, spellSlots: { ...slots, "5": { max: 1, current: 0 } } } };

    await expect(run(fireball, empty, { slotKey: "5" })).rejects.toMatchObject({ code: "action_rejected" });
  });

  it("upcastTargets adds a target per circle above the spell", async () => {
    const gob2 = participant("gob2", { side: ParticipantSide.ENEMY, controlledBy: "dm", name: "Гоблін 2" });

    const area = { ...fireball, targeting: { kind: "area", side: "enemy", maxTargets: 1 } } as unknown as Spell;

    const body = { targetIds: ["gob", "gob2"] };

    await expect(run(area, caster(true), { ...body, slotKey: "3", diceRolls: Array(8).fill(3) }, [caster(true), goblin, gob2])).rejects.toMatchObject({ code: "invalid_target" });

    const out = await run(area, caster(true), { ...body, slotKey: "pact", diceRolls: Array(9).fill(3) }, [caster(true), goblin, gob2]);

    expect(out.events).toHaveLength(1);
  });

  describe("single-target upcast", () => {
    const hold = { ...fireball, level: 2, dice: 0, dieSides: null, upcastDice: null, upcastTargets: 1 } as unknown as Spell;

    const gobs = ["g1", "g2", "g3", "g4"].map((id) => participant(id, { side: ParticipantSide.ENEMY, controlledBy: "dm", name: id }));

    const cast = (c: BattleParticipant, n: number, slotKey = "4") =>
      run(hold, c, { slotKey, targetIds: gobs.slice(0, n).map((g) => g.basicInfo.id) }, [c, ...gobs]);

    const withSlot4 = (c: BattleParticipant) => ({ ...c, spellcasting: { ...c.spellcasting, spellSlots: { ...slots, "2": { max: 1, current: 1 }, "4": { max: 1, current: 1 } } } });

    it("5e caster at circle 4 accepts 3 targets and rejects 4", async () => {
      const hero = withSlot4(caster(true));

      expect((await cast(hero, 3)).events).toHaveLength(1);
      await expect(cast(hero, 4)).rejects.toMatchObject({ code: "invalid_target" });
    });

    it("no extra circle keeps one target", async () => {
      await expect(cast(withSlot4(caster(true)), 2, "2")).rejects.toMatchObject({ code: "invalid_target" });
    });

    it("HOMM caster with 2 targets is rejected", async () => {
      await expect(cast(withSlot4(caster(false)), 2)).rejects.toMatchObject({ code: "invalid_target" });
    });
  });
});
