import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyBattleResult, applyCharacterResources } from "@/lib/utils/characters/resources/battle";
import { applyRest } from "@/lib/utils/characters/resources/rest";
import { buildRestBlock } from "@/lib/utils/characters/sheet/rest-block";
import { parseRules } from "@/lib/utils/rules/schema";
import type { BattleParticipant } from "@/types/battle";

const FOCUS = "pool:monk:focus-points";

const SORC = "pool:sorc:sorcery-points";

const MAGIC_INITIATE = "pool:grant:feat%3Af-mi:cantrips:sp-guidance";

const rules = parseRules({ classes: { enabled: true }, outOfCombat: { persistResources: true } });

function hero(usage: Record<string, number> = {}): BattleParticipant {
  const p = makeParticipant({ id: "h" });

  return {
    ...p,
    battleData: {
      ...p.battleData,
      pools: { [FOCUS]: { label: "Focus Points", max: 5, rest: "short" }, [SORC]: { label: "Sorcery Points", max: 4, rest: "long" }, [MAGIC_INITIATE]: { label: "Magic Initiate", max: 1, rest: "long" } },
      abilityUsage: Object.fromEntries(Object.entries(usage).map(([k, battle]) => [k, { battle, round: 0, turn: 0 }])),
    },
  };
}

describe("pools between battles", () => {
  it("battle result stores spent pools with their rest kind", () => {
    expect(applyBattleResult({}, hero({ [FOCUS]: 1, [SORC]: 2, [MAGIC_INITIATE]: 1 })).charges).toEqual({ [FOCUS]: { used: 1, rest: "short" }, [SORC]: { used: 2, rest: "long" }, [MAGIC_INITIATE]: { used: 1, rest: "long" } });
  });

  it("battle start restores spent pools", () => {
    const p = applyCharacterResources(hero(), { resources: { charges: { [FOCUS]: { used: 2, rest: "short" }, [MAGIC_INITIATE]: { used: 1, rest: "long" } } }, inspiration: null }, rules);

    expect(p.battleData.abilityUsage?.[FOCUS]).toEqual({ battle: 2, round: 0, turn: 0 });
    expect(p.battleData.abilityUsage?.[MAGIC_INITIATE]).toEqual({ battle: 1, round: 0, turn: 0 });
  });

  it("short rest refills short pools only; long rest refills all", () => {
    const r = { charges: { [FOCUS]: { used: 1, rest: "short" as const }, [SORC]: { used: 2, rest: "long" as const }, [MAGIC_INITIATE]: { used: 1, rest: "long" as const } } };

    expect(applyRest("short", r, { pool: [], longRestHitDice: "half" }).charges).toEqual({ [SORC]: { used: 2, rest: "long" }, [MAGIC_INITIATE]: { used: 1, rest: "long" } });
    expect(applyRest("long", r, { pool: [], longRestHitDice: "half" }).charges).toBeUndefined();
  });

  it("sheet rest block lists pools as charges", () => {
    const block = buildRestBlock({ participant: hero({ [FOCUS]: 1 }), character: { level: 5 }, rules, maxLevel: 20 });

    expect(block?.charges).toEqual([
      { key: FOCUS, name: "Focus Points", uses: 5, used: 1, rest: "short" },
      { key: SORC, name: "Sorcery Points", uses: 4, used: 0, rest: "long" },
      { key: MAGIC_INITIATE, name: "Magic Initiate", uses: 1, used: 0, rest: "long" },
    ]);
  });
});
