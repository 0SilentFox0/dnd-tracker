import { describe, expect, it } from "vitest";

import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import { hiddenEffect } from "@/lib/utils/battle/actions/effects";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleParticipant } from "@/types/battle";

const cure: CastableSpell = {
  id: "cure",
  name: "Зцілення ран",
  level: 1,
  groupId: "light",
  definition: { dice: 2, cost: "action", targeting: { kind: "ally" }, resolution: { kind: "auto" }, effects: [{ kind: "heal", amount: { spellRoll: 100 } }], raceModifiers: [] },
};

describe("каст знімає «Схований»", () => {
  it("знімає лише коли ефект є", () => {
    const base = makeParticipant({ id: "c" });

    const c = { ...base, spellcasting: { ...base.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };

    const hidden = upsertTimedEffect(c, hiddenEffect("c"), 1);

    const cast = (p: BattleParticipant) => castSpell({ caster: p, spell: cure, targetIds: ["c"], allParticipants: [p], currentRound: 1, battleId: "b", diceRolls: [3, 3], rng: seq(0.5) });

    const after = cast(hidden).allParticipantsUpdated.find((p) => p.basicInfo.id === "c");

    expect(after?.battleData.activeEffects.some((e) => e.name === "Схований")).toBe(false);
    expect(cast(c).allParticipantsUpdated.find((p) => p.basicInfo.id === "c")?.battleData.activeEffects).toHaveLength(0);
  });
});
