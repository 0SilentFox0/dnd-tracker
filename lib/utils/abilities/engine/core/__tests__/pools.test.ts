import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { poolAffordable, poolLeft, recordUse, resetUsage, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { abilityOptions, poolViews } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const KEY = "pool:monk:focus-points";

const pd = resolved({ id: "pd", name: "Patient Defense", trigger: { event: "bonusAction" }, limits: { pool: { key: KEY, cost: 1 } }, effects: [{ kind: "note", text: "pd" }] }, { type: "class", id: "monk" });

const sd = resolved({ id: "sd", name: "Superior Defense", trigger: { event: "bonusAction" }, limits: { pool: { key: KEY, cost: 3 } }, effects: [{ kind: "note", text: "sd" }] }, { type: "class", id: "monk" });

function monk(max = 5, used = 0): BattleParticipant {
  const p = makeParticipant({ id: "m", abilities: [pd, sd] });

  return { ...p, battleData: { ...p.battleData, pools: { [KEY]: { label: "Focus Points", max, rest: "short" } }, abilityUsage: used ? { [KEY]: { battle: used, round: 0, turn: 0 } } : {} } };
}

const use = (p: BattleParticipant, key: string) => runAbilities([p], { type: "bonusAction", actorId: "m", abilityKey: key, targetIds: [] }, { round: 1, rng: seq(0.5) });

describe("shared pools", () => {
  it("spending a cost lowers the shared pool for every ability", () => {
    const after = use(monk(), pd.key).participants[0];

    expect(poolLeft(after, KEY)).toBe(4);

    const afterSd = use(after, sd.key).participants[0];

    expect(poolLeft(afterSd, KEY)).toBe(1);
    expect(withinCountLimits(afterSd, pd)).toBe(true);
    expect(withinCountLimits(afterSd, sd)).toBe(false);
    expect(use(afterSd, sd.key).fired).toEqual([]);
  });

  it("no pool on the participant (non-class ability or empty column) → unavailable", () => {
    const p = makeParticipant({ id: "m", abilities: [pd] });

    expect(poolAffordable(p, pd)).toBe(false);
    expect(poolLeft(p, KEY)).toBeNull();
  });

  it("round/turn resets do not refill; shrunk max never goes negative", () => {
    expect(poolLeft(resetUsage(resetUsage(monk(5, 4), "round"), "turn"), KEY)).toBe(1);
    expect(poolLeft(monk(3, 5), KEY)).toBe(0);
  });

  it("recordUse without a pool is unchanged", () => {
    const p = recordUse(monk(), pd.key, 1);

    expect(p.battleData.abilityUsage?.[KEY]).toBeUndefined();
    expect(recordUse(monk(), pd.key, 1, { key: KEY, cost: 2 }).battleData.abilityUsage?.[KEY]).toEqual({ battle: 2, round: 2, turn: 2, lastRound: 1 });
  });

  it("views: hero card pools and the picker tile", () => {
    expect(poolViews(monk(5, 2))).toEqual([{ key: KEY, label: "Focus Points", left: 3, max: 5 }]);
    expect(abilityOptions(monk(5, 2), "bonusAction", 1).map((o) => [o.ability.id, o.pool?.left, o.pool?.cost])).toEqual([["pd", 3, 1], ["sd", 3, 3]]);
    expect(abilityOptions(monk(5, 3), "bonusAction", 1).map((o) => o.ability.id)).toEqual(["pd"]);
  });
});
