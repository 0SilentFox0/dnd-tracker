import { describe, expect, it } from "vitest";

import { makeParticipant } from "./fixtures";

import { applySpellTimedEffect } from "@/lib/utils/abilities/engine/effects/opposing-spells";
import type { TimedEffectInput } from "@/lib/utils/abilities/engine/effects/timed-effects";

const entry = (key: string, name: string, flat: number): TimedEffectInput => ({
  timedKey: `spell:${key}#0`,
  name,
  type: "buff",
  rounds: 3,
  stackable: false,
  abilityEffects: [{ kind: "modifyStat", stat: "speed", flat }],
});

describe("applySpellTimedEffect", () => {
  it("додає ефект і повертає знятий протилежний", () => {
    const slowed = applySpellTimedEffect(makeParticipant({ id: "t" }), entry("slow", "Сповільнення", -2), 1).participant;

    const { participant, removed } = applySpellTimedEffect(slowed, entry("haste", "Поспіх", 2), 1);

    expect(removed.map((e) => e.name)).toEqual(["Сповільнення"]);
    expect(participant.battleData.activeEffects.map((e) => e.name)).toEqual(["Поспіх"]);
  });

  it("не чіпає ефект того ж знаку, іншої осі й не-заклинання", () => {
    const base = applySpellTimedEffect(makeParticipant({ id: "t" }), entry("haste", "Поспіх", 2), 1).participant;

    const other = applySpellTimedEffect(base, { ...entry("bless", "Благословення", 1), abilityEffects: [{ kind: "modifyStat", stat: "armor", flat: -1 }] }, 1);

    expect(other.removed).toEqual([]);
    expect(other.participant.battleData.activeEffects).toHaveLength(2);

    const skill = applySpellTimedEffect(other.participant, { ...entry("x", "Вміння", -2), timedKey: "skill:x#0" }, 1);

    expect(skill.removed).toEqual([]);
  });

  it("повторне накладання того ж заклинання оновлює, а не знімає", () => {
    const once = applySpellTimedEffect(makeParticipant({ id: "t" }), entry("haste", "Поспіх", 2), 1).participant;

    const twice = applySpellTimedEffect(once, entry("haste", "Поспіх", 2), 2);

    expect(twice.removed).toEqual([]);
    expect(twice.participant.battleData.activeEffects).toHaveLength(1);
  });
});
