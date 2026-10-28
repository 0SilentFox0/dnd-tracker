import type { Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { adaptCompendium } from "@/lib/server/compendium-import/adapt";
import type { BattleParticipant } from "@/types/battle";

const base = { name: "Synthetic Spell", source: "Test", level: 2, school: "V", time: [{ number: 1, unit: "action" }], range: { type: "point", distance: { type: "feet", amount: 60 } }, duration: [{ type: "instant" }], entries: ["Synthetic text."] };

const imported = (row: Record<string, unknown>): Spell => {
  const entry = adaptCompendium({ _meta: { edition: "one" }, spell: [{ ...base, ...row }] }).entries.find((e) => e.kind === "spells")!;

  expect(entry.body.executionMode).toBe("native");

  return { id: "s1", campaignId: "c1", icon: null, groupId: null, raceModifiers: [], ...entry.body, level: row.level ?? base.level } as unknown as Spell;
};

const slots = { "1": { max: 2, current: 2 }, "2": { max: 2, current: 2 }, "3": { max: 2, current: 2 } };

const base5e = participant("hero", { controlledBy: "user-1" }, { spellcasting: { spellSlots: slots, knownSpells: ["s1"] } });

const caster = { ...base5e, abilities: { ...base5e.abilities, level: 5, damageModel: "5e" as const } };

const foe = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 60, maxHp: 60, armorClass: 10 } } as BattleParticipant;

const cast = (spell: Spell, over: Record<string, unknown> = {}, who: BattleParticipant[] = [caster, foe]) =>
  createSpellMutation({ loadSpell: vi.fn(async () => spell), loadPool: async () => ({ units: [], races: [] }) })(context({ participants: who, isDM: true, userId: "dm" }), { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [], ...over } as never);

const part = (out: { participants: BattleParticipant[] }, id: string) => out.participants.find((p) => p.basicInfo.id === id)!;

describe("imported native spells cast through the real spell mutation", () => {
  it("spell attack damage with upcast dice and a spent slot", async () => {
    const spell = imported({ entries: ["Make a ranged spell attack. On a hit, the target takes {@damage 2d12} bludgeoning damage."], entriesHigherLevel: [{ type: "entries", entries: ["When you cast this spell using a spell slot of 3rd level or higher, the damage increases by {@dice 1d12} for each slot level above 2nd."] }], damageInflict: ["bludgeoning"], spellAttack: ["R"] });

    const out = await cast(spell, { slotKey: "3", diceRolls: [5, 6, 7], attackRolls: [{ participantId: "gob", roll: 18 }] });

    expect(part(out, "gob").combatStats.currentHp).toBe(60 - 18);
    expect(part(out, "hero").spellcasting.spellSlots["3"].current).toBe(1);
  });

  it("a missed spell attack deals no damage", async () => {
    const spell = imported({ entries: ["Make a ranged spell attack. On a hit, the target takes {@damage 1d8} fire damage."], damageInflict: ["fire"], spellAttack: ["R"] });

    const out = await cast(spell, { diceRolls: [8], attackRolls: [{ participantId: "gob", roll: 2 }] });

    expect(part(out, "gob").combatStats.currentHp).toBe(60);
  });

  it("save damage: full on failure, half on success", async () => {
    const spell = imported({ entries: ["The target must make a Dexterity saving throw, taking {@damage 4d6} fire damage on a failed save, or half as much damage on a successful one."], damageInflict: ["fire"], savingThrow: ["dexterity"] });

    const failed = await cast(spell, { diceRolls: [6, 6, 6, 6], saveRolls: [{ participantId: "gob", roll: 2 }] });

    const saved = await cast(spell, { diceRolls: [6, 6, 6, 6], saveRolls: [{ participantId: "gob", roll: 19 }] });

    expect(part(failed, "gob").combatStats.currentHp).toBe(36);
    expect(part(saved, "gob").combatStats.currentHp).toBe(48);
  });

  it("condition on a failed save", async () => {
    const spell = imported({ entries: ["The target must succeed on a Wisdom saving throw or be {@condition frightened} until the end of your next turn."], savingThrow: ["wisdom"], conditionInflict: ["frightened"], duration: [{ type: "timed", duration: { type: "round", amount: 1 } }] });

    const out = await cast(spell, { saveRolls: [{ participantId: "gob", roll: 2 }] });

    expect(JSON.stringify(part(out, "gob").battleData.activeEffects)).toContain("frightened");
  });

  it("self-applied condition as a reaction", async () => {
    const spell = imported({ time: [{ number: 1, unit: "reaction", condition: "when seen" }], range: { type: "point", distance: { type: "self" } }, duration: [{ type: "timed", duration: { type: "round", amount: 1 } }], entries: ["You temporarily become {@condition invisible}."] });

    const out = await cast(spell, { targetIds: [] });

    expect(JSON.stringify(part(out, "hero").battleData.activeEffects)).toContain("invisible");
  });

  it("speed debuff via modifyStat", async () => {
    const spell = imported({ level: 0, entries: ["The creature's speed is reduced by 10 feet until the start of your next turn."] });

    const out = await cast(spell);

    expect(JSON.stringify(part(out, "gob").battleData.activeEffects)).toContain("speed");
  });

  it("narrative-only spell is a no-op that still resolves", async () => {
    const spell = imported({ level: 1, entries: ["You duplicate a simple object you can see."] });

    const out = await cast(spell, { targetIds: [] });

    expect(out.events).toHaveLength(1);
    expect(part(out, "gob").combatStats.currentHp).toBe(60);
  });
});
