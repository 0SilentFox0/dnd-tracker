import { describe, expect, it } from "vitest";

import { CombatStatus } from "@/lib/constants/battle";
import { goblin, hero } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { hasCondition, PERMANENT_ROUNDS } from "@/lib/utils/battle/conditions";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { startDying } from "@/systems/d20/rules/death-saves/start";
import { DEATH_SAVES_TIMED_KEY } from "@/systems/d20/rules/death-saves/state";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

const DND5E: Ruleset = { ...DEFAULT_RULES, system: { key: "dnd5e" } };

const WFRP: Ruleset = { ...WFRP_RULES, deathSaves: { ...WFRP_RULES.deathSaves, enabled: true } };

const prone = (rules: Ruleset) =>
  ruleSystemOf(rules).conditionSet.apply([hero, goblin], "gob", { key: "prone", rounds: PERMANENT_ROUNDS, permanent: true, source: undefined, sourceName: "DM", timedKey: "t", round: 1, rules });

describe("conditionSet hook", () => {
  it.each([["homm", DEFAULT_RULES], ["dnd5e", DND5E]])("%s applies the 5e set", (_key, rules) => {
    const result = prone(rules);

    expect(result.blocked).toBe(false);
    expect(hasCondition(result.participants[1], "prone")).toBe(true);
  });

  it("wfrp has no 5e set: blocked, participants untouched", () => {
    const ps = [hero, goblin];

    const result = ruleSystemOf(WFRP).conditionSet.apply(ps, "gob", { key: "prone", rounds: 1, source: undefined, sourceName: "DM", timedKey: "t", round: 1, rules: WFRP });

    expect(result).toEqual({ participants: ps, messages: [], blocked: true });
  });

  it("startDying adds the unconscious condition with the death-saves timer", () => {
    const d20 = startDying(hero, DND5E);

    expect(hasCondition(d20, "unconscious")).toBe(true);
    expect(d20.battleData.activeEffects.some((e) => e.abilityKey === DEATH_SAVES_TIMED_KEY)).toBe(true);
    expect(d20.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
  });
});
