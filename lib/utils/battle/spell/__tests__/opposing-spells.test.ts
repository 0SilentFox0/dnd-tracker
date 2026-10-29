import { describe, expect, it } from "vitest";

import { SPELLS } from "@/data/library/spells";
import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { movementBudget } from "@/lib/utils/battle/grid";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { castSpell } from "@/lib/utils/battle/spell";
import { calculateInitiative } from "@/lib/utils/battle/turn/initiative";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleParticipant } from "@/types/battle";

const spellOf = (key: string): CastableSpell => {
  const s = SPELLS.find((x) => x.key === key);

  if (!s) throw new Error(key);

  return { id: key, name: s.name, level: s.level, groupId: s.school, definition: { ...s.definition, raceModifiers: [] } };
};

const unit = (id: string, side: ParticipantSide): BattleParticipant => {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, name: id, side, sourceType: ParticipantSourceType.UNIT, controlledBy: side === ParticipantSide.ALLY ? "user-1" : "dm" },
    abilities: { ...b.abilities, initiative: 10, baseInitiative: 10 },
    combatStats: { ...b.combatStats, currentHp: 500, maxHp: 500 },
    spellcasting: { ...b.spellcasting, spellSlots: { universal: { max: 9, current: 9 } } },
  };
};

const ALLY_CASTER = unit("ally-mage", ParticipantSide.ALLY);

const ENEMY_CASTER = unit("enemy-mage", ParticipantSide.ENEMY);

const world = () => [ALLY_CASTER, ENEMY_CASTER, unit("t", ParticipantSide.ALLY)];

const cast = (key: string, ps: BattleParticipant[]) => {
  const spell = spellOf(key);

  const caster = spell.definition.targeting.kind === "ally" ? ALLY_CASTER : ENEMY_CASTER;

  const out = castSpell({ caster, spell, targetIds: ["t"], allParticipants: ps, currentRound: 1, battleId: "b", diceRolls: [1, 1, 1], saveRolls: [{ participantId: "t", roll: 1 }], rng: seq(0.01) });

  if (!out.success) throw new Error(key);

  return out;
};

const castAll = (keys: string[]) => keys.reduce((ps, key) => cast(key, ps).allParticipantsUpdated, world());

const target = (ps: BattleParticipant[]) => findParticipant(ps, "t") as BattleParticipant;

const names = (ps: BattleParticipant[]) => [...new Set(target(ps).battleData.activeEffects.map((e) => e.name))];

const base = world()[2];

describe("протилежні заклинання знімають одне одного — діє лише останнє", () => {
  it("Поспіх → Сповільнення: лишається тільки Сповільнення", () => {
    const ps = castAll(["haste", "slow"]);

    expect(names(ps)).toEqual(["Сповільнення"]);
    expect(calculateInitiative(target(ps), ps)).toBe(7);
    expect(movementBudget(target(ps))).toBe(movementBudget(base) - 2);
  });

  it("Сповільнення → Поспіх: лишається тільки Поспіх, у журналі — зняття", () => {
    const ps = castAll(["slow"]);

    const out = cast("haste", ps);

    expect(names(out.allParticipantsUpdated)).toEqual(["Поспіх"]);
    expect(calculateInitiative(target(out.allParticipantsUpdated), out.allParticipantsUpdated)).toBe(13);
    expect(eventTextOf(out.battleAction)).toContain("знімає «Сповільнення»");
  });

  it("Кам'яна шкіра ↔ Немічність (усі стеки)", () => {
    expect(names(castAll(["stoneskin", "frailty"]))).toEqual(["Немічність"]);
    expect(names(castAll(["frailty", "frailty", "stoneskin"]))).toEqual(["Кам'яна шкіра"]);
  });

  it("Праведна міць ↔ Страждання / Ослаблення знімають лише протилежну частину", () => {
    expect(names(castAll(["righteous-might", "suffering", "weakness"]))).toEqual(["Страждання", "Ослаблення"]);
    expect(names(castAll(["weakness", "divine-strength"]))).toEqual(["Божественна сила"]);
  });

  it("різні стати складаються", () => {
    const ps = castAll(["stoneskin", "haste", "suffering"]);

    expect(names(ps)).toEqual(["Кам'яна шкіра", "Поспіх", "Страждання"]);
    expect(collectModifiers(ps, "t", { stat: "armor" }).flat).toBe(3);
  });
});
