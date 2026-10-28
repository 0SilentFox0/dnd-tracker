import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { startDying } from "@/lib/utils/battle/death-saves";
import { castSpell } from "@/lib/utils/battle/spell";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const rules: Ruleset = { ...DEFAULT_RULES, deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true } };

const cure: CastableSpell = {
  id: "cure",
  name: "Зцілення ран",
  level: 1,
  groupId: "light",
  definition: { dice: 2, cost: "action", targeting: { kind: "ally" }, resolution: { kind: "auto" }, effects: [{ kind: "heal", amount: { spellRoll: 100 } }], raceModifiers: [] },
};

const caster = () => {
  const p = makeParticipant({ id: "c" });

  return { ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };
};

const downed = () => startDying(makeParticipant({ id: "a", hp: 0 }), rules);

describe("лікування героя, що вмирає", () => {
  it("ціль-союзник у стані кидків смерті приймається, мертвий ні", () => {
    const dead = { ...downed(), battleData: { ...downed().battleData, deathSaves: undefined }, combatStats: { ...downed().combatStats, status: CombatStatus.DEAD } };

    expect(resolveSpellTargets([caster(), downed()], caster(), cure, cure.definition.targeting, ["a"]).ok).toBe(true);
    expect(resolveSpellTargets([caster(), dead], caster(), cure, cure.definition.targeting, ["a"]).ok).toBe(false);
  });

  it("не дозволяє бити ворога, що вмирає", () => {
    const foe = { ...downed(), basicInfo: { ...downed().basicInfo, side: ParticipantSide.ENEMY } };

    expect(resolveSpellTargets([caster(), foe], caster(), cure, { kind: "enemy" }, ["a"]).ok).toBe(false);
  });

  it("зцілення будить героя й чистить кидки смерті", () => {
    const c = caster();

    const r = castSpell({ caster: c, spell: cure, targetIds: ["a"], allParticipants: [c, downed()], currentRound: 1, battleId: "b", diceRolls: [3, 3], rng: seq(0.5), rules });

    const a = r.allParticipantsUpdated.find((p) => p.basicInfo.id === "a");

    expect(a?.combatStats.currentHp).toBeGreaterThan(0);
    expect(a?.combatStats.status).toBe(CombatStatus.ACTIVE);
    expect(a?.battleData.deathSaves).toBeUndefined();
  });
});
