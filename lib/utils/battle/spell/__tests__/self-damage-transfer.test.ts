import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { assertSpellRolls } from "@/lib/utils/battle/validation/dice-checks";
import { SpellDefinitionSchema } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

const effects: Effect[] = [
  { kind: "dealDamage", target: "self", amount: { spellRoll: 100 }, damageType: "necrotic" },
  { kind: "heal", target: "eventTarget", amount: { percentOf: "eventDamage", value: 100 } },
];

const spell: CastableSpell = {
  id: "sp",
  name: "Синтетичний дар",
  level: 1,
  groupId: "chaos",
  definition: { dice: 2, dieSides: 20, cost: "action", targeting: { kind: "ally" }, resolution: { kind: "auto" }, effects, raceModifiers: [] },
};

const caster = (over: { hp?: number; resist?: boolean } = {}): BattleParticipant => {
  const p = makeParticipant({ id: "c", hp: over.hp ?? 100, maxHp: 100 });

  const withSlots = { ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };

  if (over.resist) withSlots.battleData.resolvedAbilities = [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "necrotic", percent: 50 }] })];

  return withSlots;
};

const run = (c: BattleParticipant, ally: BattleParticipant) => castSpell({ caster: c, spell, targetIds: ["a"], allParticipants: [c, ally], currentRound: 1, battleId: "b", diceRolls: [10, 10], rng: seq(0.5) });

const hp = (r: { allParticipantsUpdated: BattleParticipant[] }, id: string) => r.allParticipantsUpdated.find((p) => p.basicInfo.id === id)?.combatStats.currentHp as number;

describe("d20 у заклинаннях", () => {
  it("схема приймає d20", () => {
    expect(SpellDefinitionSchema.safeParse(spell.definition).success).toBe(true);
  });

  it("assertSpellRolls: кидок до 20 допустимий, 21 ні", () => {
    expect(() => assertSpellRolls({ count: 1, sides: 20 }, [20])).not.toThrow();
    expect(() => assertSpellRolls({ count: 1, sides: 20 }, [21])).toThrow();
  });
});

describe("шкода кастеру з передачею цілі", () => {
  it("кастер втрачає N, ціль лікується на N", () => {
    const r = run(caster(), makeParticipant({ id: "a", hp: 10, maxHp: 100 }));

    expect(hp(r, "c")).toBe(80);
    expect(hp(r, "a")).toBe(30);
  });

  it("опір кастера: N/2 і ціль лікується на N/2", () => {
    const r = run(caster({ resist: true }), makeParticipant({ id: "a", hp: 10, maxHp: 100 }));

    expect(hp(r, "c")).toBe(90);
    expect(hp(r, "a")).toBe(20);
  });

  it("кастер на 0 HP непритомний", () => {
    const r = run(caster({ hp: 15 }), makeParticipant({ id: "a", hp: 10, maxHp: 100 }));

    const c = r.allParticipantsUpdated.find((p) => p.basicInfo.id === "c");

    expect(c?.combatStats.currentHp).toBe(0);
    expect(c?.combatStats.status).not.toBe("active");
    expect(hp(r, "a")).toBe(30);
  });
});
