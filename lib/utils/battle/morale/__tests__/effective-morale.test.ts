import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { FlagEffect } from "@/lib/utils/abilities/schema";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import type { BattleParticipant } from "@/types/battle";

function withMorale(morale: number, flags: FlagEffect[] = [], race = "Людина"): BattleParticipant {
  const p = makeParticipant({ id: "p", abilities: flags.length ? [resolved({ trigger: { event: "passive" }, effects: flags })] : [] });

  return { ...p, abilities: { ...p.abilities, race }, combatStats: { ...p.combatStats, morale } };
}

describe("effectiveMorale", () => {
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
});
