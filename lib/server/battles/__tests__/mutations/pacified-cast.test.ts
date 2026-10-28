import type { Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { adaptCompendium } from "@/lib/server/compendium-import/adapt";
import type { BattleParticipant } from "@/types/battle";

const entry = adaptCompendium({
  _meta: { edition: "one" },
  spell: [{ name: "Synthetic Bolt", source: "Test", level: 1, school: "V", time: [{ number: 1, unit: "action" }], range: { type: "point", distance: { type: "feet", amount: 60 } }, duration: [{ type: "instant" }], entries: ["Make a ranged spell attack. On a hit, the target takes {@damage 1d8} fire damage."], damageInflict: ["fire"], spellAttack: ["R"] }],
}).entries.find((e) => e.kind === "spells")!;

const spell = { id: "s1", campaignId: "c1", icon: null, groupId: null, raceModifiers: [], ...entry.body, level: 1 } as unknown as Spell;

const marked = (p: BattleParticipant, type: string): BattleParticipant => ({ ...p, battleData: { ...p.battleData, activeEffects: [{ id: "e", name: "Стан", type: "condition", duration: 3, effects: [{ type, value: 1 }] }] as never } });

const base5e = participant("hero", { controlledBy: "user-1" }, { spellcasting: { spellSlots: { "1": { max: 2, current: 2 } }, knownSpells: ["s1"] } });

const caster = { ...base5e, abilities: { ...base5e.abilities, level: 5, damageModel: "5e" as const } };

const run = (who: BattleParticipant) =>
  createSpellMutation({ loadSpell: vi.fn(async () => spell), loadPool: async () => ({ units: [], races: [] }) })(
    context({ participants: [who, goblin], isDM: true, userId: "dm" }),
    { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [5], attackRolls: [{ participantId: "gob", roll: 18 }] } as never,
  );

describe("каст під станом no_hostile_spells", () => {
  it("ворожий каст відхиляється, без стану проходить", async () => {
    await expect(run(marked(caster, "no_hostile_spells"))).rejects.toThrow("не може накладати ворожі чари");
    await expect(run(caster)).resolves.toBeTruthy();
  });
});
