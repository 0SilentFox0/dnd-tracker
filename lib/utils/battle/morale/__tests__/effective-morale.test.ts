import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { AbilitySchema, type FlagEffect } from "@/lib/utils/abilities/schema";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import type { BattleParticipant } from "@/types/battle";

function withMorale(morale: number, flags: FlagEffect[] = [], race = "Людина"): BattleParticipant {
  const p = makeParticipant({ id: "p", abilities: flags.length ? [resolved({ trigger: { event: "passive" }, effects: flags })] : [] });

  return { ...p, abilities: { ...p.abilities, race }, combatStats: { ...p.combatStats, morale } };
}

const timed = (p: BattleParticipant, flat: number): BattleParticipant => ({
  ...p,
  battleData: {
    ...p.battleData,
    activeEffects: [
      { id: "m", name: "Підйом", type: "buff", duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [], abilityEffects: [{ kind: "modifyStat", stat: "morale", flat }] },
    ],
  },
});

describe("effectiveMorale", () => {
  it("тимчасовий бонус додається до моралі, сума обмежена ±3", () => {
    expect(effectiveMorale(timed(withMorale(2), 1), []).value).toBe(3);
    expect(effectiveMorale(timed(withMorale(3), 1), []).value).toBe(3);
    expect(effectiveMorale(timed(withMorale(-1), 1), []).value).toBe(0);
  });

  it("noNegativeMorale діє після суми", () => {
    expect(effectiveMorale(timed(withMorale(-2, [{ kind: "flag", flag: "noNegativeMorale" }]), 1), []).value).toBe(0);
  });

  it("схема приймає тимчасову мораль у bonusAction", () => {
    const ability = { id: "a", name: "Клич", trigger: { event: "bonusAction" }, effects: [{ kind: "modifyStat", stat: "morale", flat: 1, duration: { rounds: 2 }, target: "eventTarget" }] };

    expect(AbilitySchema.safeParse(ability).success).toBe(true);
  });

  it("без прапорців — сира мораль; назва раси не має значення", () => {
    expect(effectiveMorale(withMorale(-2, [], "human"), [])).toEqual({ value: -2, ignored: false });
  });

  it("noNegativeMorale: від'ємна → 0, додатна лишається", () => {
    const flag: FlagEffect = { kind: "flag", flag: "noNegativeMorale" };

    expect(effectiveMorale(withMorale(-2, [flag]), [])).toEqual({ value: 0, ignored: false });
    expect(effectiveMorale(withMorale(2, [flag]), [])).toEqual({ value: 2, ignored: false });
  });

  it("ignoreMorale: мораль не діє", () => {
    expect(effectiveMorale(withMorale(3, [{ kind: "flag", flag: "ignoreMorale" }]), [])).toEqual({ value: 0, ignored: true });
  });

  it("аура союзника теж рахується", () => {
    const aura = makeParticipant({ id: "ally", side: ParticipantSide.ALLY, abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "ignoreMorale", target: "allAllies" }] })] });

    const p = withMorale(-3);

    expect(effectiveMorale(p, [p, aura]).ignored).toBe(true);
  });

  it("minMorale: після clamp і noNegativeMorale; ignoreMorale перемагає", () => {
    const min: FlagEffect = { kind: "flag", flag: "minMorale", value: 1 };

    expect(effectiveMorale(withMorale(-2, [min]), []).value).toBe(1);
    expect(effectiveMorale(withMorale(3, [min]), []).value).toBe(3);
    expect(effectiveMorale(withMorale(-2, [min, { kind: "flag", flag: "noNegativeMorale" }]), []).value).toBe(1);
    expect(effectiveMorale(withMorale(-2, [min, { kind: "flag", flag: "ignoreMorale" }]), [])).toEqual({ value: 0, ignored: true });
  });
});
