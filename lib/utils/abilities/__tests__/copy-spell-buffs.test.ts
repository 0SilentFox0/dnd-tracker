import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "./fixtures";

import { SPELLS } from "@/data/library/spells";
import { ELF_UNITS } from "@/data/library/units/elves";
import { ParticipantSide } from "@/lib/constants/battle";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleParticipant } from "@/types/battle";

const spell = (key: string, groupId = "Світло"): CastableSpell => {
  const s = SPELLS.find((x) => x.key === key);

  if (!s) throw new Error(key);

  return { id: key, name: s.name, level: s.level, groupId, definition: { ...s.definition, raceModifiers: [] } };
};

const slots = Object.fromEntries([1, 2, 3, 4, 5].map((l) => [String(l), { max: 3, current: 3 }]));

const caster = (side: ParticipantSide = ParticipantSide.ALLY): BattleParticipant => {
  const p = makeParticipant({ id: "mage", side });

  return { ...p, spellcasting: { ...p.spellcasting, spellSlots: slots } };
};

const unicorn = (side: ParticipantSide = ParticipantSide.ALLY): BattleParticipant => {
  const echo = ELF_UNITS.find((u) => u.key === "elves-light-unicorn")?.abilities.find((a) => a.id === "unit-light-echo");

  if (!echo) throw new Error("unit-light-echo");

  return makeParticipant({ id: "u", side, abilities: [resolved(echo, { type: "unit", id: "u" })] });
};

function cast(key: string, order: BattleParticipant[], targetId: string, groupId?: string) {
  return castSpell({
    caster: order[0],
    spell: spell(key, groupId),
    targetIds: [targetId],
    allParticipants: order,
    currentRound: 1,
    battleId: "b1",
    diceRolls: [],
    saveRolls: [],
    rng: seq(0.5),
  }).allParticipantsUpdated;
}

const byId = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

const named = (p: BattleParticipant, name: string) => p.battleData.activeEffects.filter((e) => e.name === name);

describe("Світле відлуння — копіювання бафів Світла", () => {
  const order = () => [caster(), makeParticipant({ id: "a" }), unicorn()];

  it("Кам'яна шкіра на союзника → єдиноріг теж отримує +3 AC", () => {
    const ps = cast("stoneskin", order(), "a");

    expect(named(byId(ps, "u"), "Кам'яна шкіра")).toHaveLength(1);
    expect(collectModifiers(ps, "u", { stat: "armor" }).flat).toBe(3);
  });

  it("Поспіх копіюється обома частинами", () => {
    const ps = cast("haste", order(), "a");

    expect(named(byId(ps, "u"), "Поспіх")).toHaveLength(2);
    expect(collectModifiers(ps, "u", { stat: "initiative" }).flat).toBe(3);
    expect(collectModifiers(ps, "u", { stat: "speed" }).flat).toBe(10);
  });

  it("закляття на самого єдинорога — без дубля", () => {
    const ps = cast("stoneskin", order(), "u");

    expect(named(byId(ps, "u"), "Кам'яна шкіра")).toHaveLength(1);
  });

  it("не копіює закляття іншої школи і закляття на ворога", () => {
    const withEnemy = [caster(), makeParticipant({ id: "e", side: ParticipantSide.ENEMY }), unicorn()];

    expect(byId(cast("stoneskin", withEnemy, "e"), "u").battleData.activeEffects).toHaveLength(0);
    expect(byId(cast("stoneskin", order(), "a", "Природа"), "u").battleData.activeEffects).toHaveLength(0);
  });

  it("єдиноріг ворожої сторони не копіює наші бафи", () => {
    const ps = cast("stoneskin", [caster(), makeParticipant({ id: "a" }), unicorn(ParticipantSide.ENEMY)], "a");

    expect(byId(ps, "u").battleData.activeEffects).toHaveLength(0);
  });
});
