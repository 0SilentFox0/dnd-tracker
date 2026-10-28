import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyBattleResult, applyCharacterResources } from "@/lib/utils/characters/resources/battle";
import { applyRest } from "@/lib/utils/characters/resources/rest";
import { readResources } from "@/lib/utils/characters/resources/schema";
import { buildRestBlock } from "@/lib/utils/characters/sheet/rest-block";
import { parseRules } from "@/lib/utils/rules/schema";
import type { BattleParticipant } from "@/types/battle";

const WAND = "pool:item:wand";

const RING = "pool:item:ring";

const POT = "pool:consumable:p1";

const rules = parseRules({ items: { enabled: true }, outOfCombat: { persistResources: true } });

function hero(usage: Record<string, number> = {}): BattleParticipant {
  const p = makeParticipant({ id: "h" });

  return {
    ...p,
    battleData: {
      ...p.battleData,
      pools: { [WAND]: { label: "Wand", max: 7, rest: "long" }, [RING]: { label: "Ring", max: 3, rest: null }, [POT]: { label: "Potion", max: 2, rest: null } },
      abilityUsage: Object.fromEntries(Object.entries(usage).map(([k, battle]) => [k, { battle, round: 0, turn: 0 }])),
    },
  };
}

describe("item charges between battles", () => {
  it("battle result stores item pools (rest null too), never consumable pools", () => {
    expect(applyBattleResult({}, hero({ [WAND]: 1, [RING]: 2, [POT]: 1 })).charges).toEqual({ [WAND]: { used: 1, rest: "long" }, [RING]: { used: 2, rest: null } });
  });

  it("battle start restores spent item pools, ignores consumable keys", () => {
    const p = applyCharacterResources(hero(), { resources: { charges: { [WAND]: { used: 2, rest: "long" }, [POT]: { used: 1, rest: null } } }, inspiration: null }, rules);

    expect(p.battleData.abilityUsage?.[WAND]).toEqual({ battle: 2, round: 0, turn: 0 });
    expect(p.battleData.abilityUsage?.[POT]).toBeUndefined();
  });

  it("long rest refills long and short charges, keeps rest null; schema accepts null", () => {
    const r = { charges: { [WAND]: { used: 1, rest: "long" as const }, [RING]: { used: 2, rest: null } } };

    expect(applyRest("long", r, { pool: [], longRestHitDice: "half" }).charges).toEqual({ [RING]: { used: 2, rest: null } });
    expect(applyRest("short", r, { pool: [], longRestHitDice: "half" }).charges).toEqual(r.charges);
    expect(readResources(r).charges).toEqual(r.charges);
  });

  it("sheet charges list item pools but not consumables", () => {
    const block = buildRestBlock({ participant: hero({ [WAND]: 1 }), character: { level: 5 }, rules, maxLevel: 20 });

    expect(block?.charges.map((c) => [c.key, c.uses, c.used, c.rest])).toEqual([
      [WAND, 7, 1, "long"],
      [RING, 3, 0, null],
    ]);
  });
});
