import { describe, expect, it, vi } from "vitest";

import { skippedTurnAt } from "../skipped-turn";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { rollDyingAt } from "@/systems/d20/rules/death-saves/roll";
import { DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleParticipant } from "@/types/battle";

const downed = (status: BattleParticipant["combatStats"]["status"], bleeding = 0): BattleParticipant => {
  const base = createMockParticipant();

  const p: BattleParticipant = {
    ...base,
    basicInfo: { ...base.basicInfo, id: "a" },
    combatStats: { ...base.combatStats, currentHp: 0, maxHp: 20, status },
    abilities: { ...base.abilities, ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, { ap: { head: 0, arm: 0, body: 1, leg: 0 } }) },
  };

  if (!bleeding) return p;

  const bled = ruleSystemOf(WFRP_RULES).conditions!.apply([p], "a", { key: "bleeding", levels: bleeding, round: 1, sourceName: "x" }).participants[0];

  return { ...bled, combatStats: { ...bled.combatStats, status } };
};

const DND: Ruleset = { ...DEFAULT_RULES, system: { key: "dnd5e" }, deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true } };

describe("skippedTurnAt", () => {
  it("dnd5e dying: same as rollDyingAt", () => {
    const base = downed(CombatStatus.UNCONSCIOUS);

    const p: BattleParticipant = { ...base, battleData: { ...base.battleData, deathSaves: { successes: 0, failures: 0, stable: false } } };

    const got = skippedTurnAt([p], 0, { rules: DND, rng: () => 0.5, round: 2 });

    expect(got).toEqual(rollDyingAt([p], 0, DND, () => 0.5));
    expect(got).not.toBeNull();
  });

  it("dnd5e unconscious without death saves: null", () => {
    expect(skippedTurnAt([downed(CombatStatus.UNCONSCIOUS)], 0, { rules: { ...DND, deathSaves: { ...DND.deathSaves, enabled: false } }, rng: () => 0.5, round: 2 })).toBeNull();
  });

  it("wfrp unconscious: skip line first, then bleed-out lines", () => {
    const got = skippedTurnAt([downed(CombatStatus.UNCONSCIOUS, 3)], 0, { rules: WFRP_RULES, rng: () => 0.1, round: 2 });

    expect(got?.messages[0]).toMatchObject({ message: "battleLog.turn.skipUnconscious" });
    expect(JSON.stringify(got?.messages[1])).toContain("battleWfrp.log.tick.bleedOut");
    expect(got?.participants[0].combatStats.status).toBe(CombatStatus.DEAD);
  });

  it("wfrp unconscious without bleeding: only the skip line, no rng", () => {
    const rng = vi.fn(() => 0);

    const got = skippedTurnAt([downed(CombatStatus.UNCONSCIOUS)], 0, { rules: WFRP_RULES, rng, round: 2 });

    expect(got?.messages).toHaveLength(1);
    expect(rng).not.toHaveBeenCalled();
  });

  it("wfrp enemy unconscious without bleeding: no log line, still skipped; with bleeding: lines kept", () => {
    const asEnemy = (p: BattleParticipant): BattleParticipant => ({ ...p, basicInfo: { ...p.basicInfo, side: ParticipantSide.ENEMY } });

    const quiet = skippedTurnAt([asEnemy(downed(CombatStatus.UNCONSCIOUS))], 0, { rules: WFRP_RULES, rng: () => 0.5, round: 2 });

    expect(quiet?.messages).toEqual([]);

    const bleeding = skippedTurnAt([asEnemy(downed(CombatStatus.UNCONSCIOUS, 3))], 0, { rules: WFRP_RULES, rng: () => 0.1, round: 2 });

    expect(bleeding?.messages[0]).toMatchObject({ message: "battleLog.turn.skipUnconscious" });
  });

  it("wfrp active and dead: null", () => {
    expect(skippedTurnAt([downed(CombatStatus.ACTIVE, 3)], 0, { rules: WFRP_RULES, rng: () => 0, round: 2 })).toBeNull();
    expect(skippedTurnAt([downed(CombatStatus.DEAD, 3)], 0, { rules: WFRP_RULES, rng: () => 0, round: 2 })).toBeNull();
  });
});
