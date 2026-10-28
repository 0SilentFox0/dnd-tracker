import { describe, expect, it } from "vitest";

import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { buildRestBlock } from "@/lib/utils/characters/sheet/rest-block";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { GameClassData } from "@/types/classes";

const surge = resolved({ trigger: { event: "action" }, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "note", text: "x" }] } as never, { type: "class", id: "fighter" });

const p = (() => {
  const base = createMockParticipant();

  return { ...base, combatStats: { ...base.combatStats, maxHp: 30, currentHp: 12, tempHp: 2 }, battleData: { ...base.battleData, resolvedAbilities: [surge], abilityUsage: { [surge.key]: { battle: 1, round: 0, turn: 0 } } } };
})();

const fighter = { id: "fighter", name: "Воїн", hitDie: 10 } as GameClassData;

const rules = (ooc: Partial<Ruleset["outOfCombat"]>): Ruleset => ({ ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, ...ooc } });

describe("buildRestBlock", () => {
  it("null when every out-of-combat toggle is off", () => {
    expect(buildRestBlock({ participant: p, character: { level: 3 }, rules: DEFAULT_RULES, maxLevel: 20 })).toBeNull();
    expect(buildRestBlock({ participant: p, character: { level: 3 }, maxLevel: 20 })).toBeNull();
  });

  it("persisted resources: HP, hit dice, charges", () => {
    const block = buildRestBlock({
      participant: p,
      character: { level: 3, resources: { hitDiceSpent: { fighter: 1 }, exhaustion: 2, shortRestOpen: true } },
      classes: [{ classId: "fighter", level: 3, class: fighter, subclass: null }],
      rules: rules({ persistResources: true }),
      maxLevel: 20,
    });

    expect(block).toMatchObject({
      persist: true,
      hp: { current: 12, max: 30, temp: 2 },
      exhaustion: 2,
      shortRestOpen: true,
      hitDice: [{ classId: "fighter", name: "Воїн", die: 10, total: 3, spent: 1 }],
      charges: [{ key: surge.key, uses: 1, used: 1, rest: "short" }],
      inspiration: null,
      xp: null,
    });
  });

  it("shows a spell grant's remaining uses and rest cadence", () => {
    const grantKey = "pool:grant:feat%3Amagic-initiate:sp-guidance";

    const hero = { ...p, battleData: { ...p.battleData, pools: { [grantKey]: { label: "Magic Initiate: Guidance", max: 1, rest: "long" as const } }, abilityUsage: { [grantKey]: { battle: 1, round: 0, turn: 0 } } } };

    const block = buildRestBlock({ participant: hero, character: { level: 4, resources: { charges: { [grantKey]: { used: 1, rest: "long" } } } }, rules: rules({ persistResources: true }), maxLevel: 20 });

    expect(block?.charges).toContainEqual({ key: grantKey, name: "Magic Initiate: Guidance", uses: 1, used: 1, rest: "long" });
  });

  it("xp and inspiration without persisted resources", () => {
    expect(buildRestBlock({ participant: p, character: { level: 1, experience: 300, inspiration: true }, rules: rules({ xp: true, inspiration: true }), maxLevel: 20 })).toMatchObject({
      persist: false, hp: null, hitDice: [], charges: [], inspiration: true, xp: { value: 300, next: 300, levelUp: true },
    });
  });
});
